
const AUTH_API_URL = "http://localhost:5262/api/users";

const Auth = {
    // Lấy JWT Token
    getToken() {
        return localStorage.getItem("techgear_token");
    },

    // Lấy thông tin người dùng
    getUser() {
        try {
            return JSON.parse(
                localStorage.getItem("techgear_user")
            );
        } catch {
            return null;
        }
    },

    // Kiểm tra đăng nhập
    isLoggedIn() {
        return Boolean(this.getToken() && this.getUser());
    },

    // Kiểm tra quyền Admin
    isAdmin() {
        return this.getUser()?.role?.toLowerCase() === "admin";
    },

    // Gửi request đến Backend
    async request(endpoint, options = {}) {
        const response = await fetch(
            `${AUTH_API_URL}${endpoint}`,
            {
                ...options,
                headers: {
                    "Accept": "application/json",
                    ...(options.body
                        ? { "Content-Type": "application/json" }
                        : {}),
                    ...options.headers
                }
            }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.title ||
                `Lỗi máy chủ: ${response.status}`
            );
        }

        return data;
    },

    // Đăng ký Member
    async register(fullName, email, password, phoneNumber) {
        return await this.request("/register", {
            method: "POST",
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                password: password,
                phone_number: phoneNumber || null
            })
        });
    },

    // Đăng nhập
    async login(email, password) {
        const data = await this.request("/login", {
            method: "POST",
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (!data.token) {
            throw new Error("Máy chủ không trả về JWT Token.");
        }

        const user = {
            user_id: data.user_id,
            full_name: data.full_name,
            email: data.email,
            role: data.role || "Member"
        };

        localStorage.setItem("techgear_token", data.token);
        localStorage.setItem(
            "techgear_user",
            JSON.stringify(user)
        );

        // Thông báo cập nhật giao diện
        window.dispatchEvent(new Event("authChanged"));

        return user;
    },

    // Đăng xuất
    logout() {
        localStorage.removeItem("techgear_token");
        localStorage.removeItem("techgear_user");

        window.dispatchEvent(new Event("authChanged"));

        window.location.href = "account.html";
    },

    // Lấy thông tin từ Backend
    async getProfile() {
        const token = this.getToken();

        if (!token) {
            throw new Error("Bạn chưa đăng nhập.");
        }

        return await this.request("/profile", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
    }
};


// =====================================
// ACCOUNT PAGE AND HEADER
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const profileSection = document.getElementById("profile-section");
    const message = document.getElementById("account-message");

    const showLogin = document.getElementById("show-login");
    const showRegister = document.getElementById("show-register");

    // Hiển thị thông báo
    function showMessage(text, type) {
        if (!message) return;

        message.textContent = text;
        message.className = `account-message ${type}`;
    }

    // Chuyển đổi Login / Register
    function showForm(mode) {
        if (!loginForm || !registerForm || !profileSection) {
            return;
        }

        loginForm.hidden = mode !== "login";
        registerForm.hidden = mode !== "register";
        profileSection.hidden = true;

        if (message) {
            message.textContent = "";
            message.className = "account-message";
        }
    }

    // Nút chuyển sang đăng ký
    if (showRegister) {
        showRegister.addEventListener("click", () => {
            showForm("register");
        });
    }

    // Nút chuyển sang đăng nhập
    if (showLogin) {
        showLogin.addEventListener("click", () => {
            showForm("login");
        });
    }

    // =====================================
    // REGISTER MEMBER
    // =====================================

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const fullName =
                document.getElementById("register-name").value.trim();

            const email =
                document.getElementById("register-email").value.trim();

            const phone =
                document.getElementById("register-phone").value.trim();

            const password =
                document.getElementById("register-password").value;

            const confirmPassword =
                document.getElementById("confirm-password").value;

            const button =
                document.getElementById("register-button");

            if (password !== confirmPassword) {
                showMessage(
                    "Mật khẩu xác nhận không khớp.",
                    "error"
                );
                return;
            }

            if (password.length < 6) {
                showMessage(
                    "Mật khẩu phải có ít nhất 6 ký tự.",
                    "error"
                );
                return;
            }

            try {
                button.disabled = true;
                button.textContent = "Đang đăng ký...";

                await Auth.register(
                    fullName,
                    email,
                    password,
                    phone
                );

                registerForm.reset();

                showForm("login");

                document.getElementById("login-email").value = email;

                showMessage(
                    "Đăng ký thành công! Bạn có thể đăng nhập ngay.",
                    "success"
                );

            } catch (error) {
                showMessage(error.message, "error");

            } finally {
                button.disabled = false;
                button.textContent = "Đăng ký Member";
            }
        });
    }

    // =====================================
    // LOGIN
    // =====================================

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email =
                document.getElementById("login-email").value.trim();

            const password =
                document.getElementById("login-password").value;

            const button =
                document.getElementById("login-button");

            try {
                button.disabled = true;
                button.textContent = "Đang đăng nhập...";

                const user = await Auth.login(email, password);

                showMessage(
                    "Đăng nhập thành công!",
                    "success"
                );

                renderProfile(user);

            } catch (error) {
                showMessage(error.message, "error");

            } finally {
                button.disabled = false;
                button.textContent = "Đăng nhập";
            }
        });
    }

    // =====================================
    // DISPLAY USER PROFILE
    // =====================================

    function renderProfile(user) {
        if (!profileSection || !user) return;

        if (loginForm) loginForm.hidden = true;
        if (registerForm) registerForm.hidden = true;

        profileSection.hidden = false;

        document.getElementById("profile-name").textContent =
            user.full_name || "";

        document.getElementById("profile-email").textContent =
            user.email || "";

        document.getElementById("profile-role").textContent =
            user.role || "Member";

        // Chỉ Admin được nhìn thấy đường dẫn quản trị
        const adminLink =
            document.getElementById("admin-link");

        if (adminLink) {
            adminLink.hidden = !Auth.isAdmin();
        }
    }

    // =====================================
    // LOGOUT
    // =====================================

    const logoutButton =
        document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            Auth.logout();
        });
    }

    // =====================================
    // INITIAL ACCOUNT STATE
    // =====================================

    if (profileSection && Auth.isLoggedIn()) {

        renderProfile(Auth.getUser());

    } else {

        const params =
            new URLSearchParams(window.location.search);

        const mode = params.get("mode");

        showForm(
            mode === "register" ? "register" : "login"
        );
    }

    // =====================================
    // UPDATE HEADER ACCOUNT
    // =====================================

    function updateHeaderAccount() {
        const user = Auth.getUser();

        document.querySelectorAll("#account-link").forEach(link => {
            if (Auth.isLoggedIn() && user) {
                link.textContent = user.full_name || "My Account";
            } else {
                link.textContent = "Account";
            }

            link.href = "account.html";
        });
    }

    updateHeaderAccount();

    window.addEventListener("authChanged", updateHeaderAccount);

    // Cập nhật năm Footer
    const year = document.getElementById("current-year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }
});


// Cho phép các file JavaScript khác sử dụng Auth
window.Auth = Auth;
