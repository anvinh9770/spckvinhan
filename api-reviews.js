
// ==========================================
// API THEMEALDB + ĐÁNH GIÁ MÓN ĂN
// Không sửa app.js hiện có
// ==========================================

const MEAL_API = "https://www.themealdb.com/api/json/v1/1/";
const REVIEW_KEY = "foodMenuMealReviews";

let selectedMeal = null;

// Chuyển nội dung thành văn bản an toàn
function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

// Đọc đánh giá từ LocalStorage
function readReviews() {
    try {
        return JSON.parse(localStorage.getItem(REVIEW_KEY)) || {};
    } catch {
        return {};
    }
}

// Hiển thị điểm đánh giá trung bình
function mealRating(id) {
    const reviews = readReviews()[id] || [];

    if (!reviews.length) {
        return '<span class="text-muted">Chưa có đánh giá</span>';
    }

    const avg = reviews.reduce(
        (sum, review) => sum + Number(review.stars), 0
    ) / reviews.length;

    return `<span class="rating-stars">★</span>
            ${avg.toFixed(1)}/5 (${reviews.length} đánh giá)`;
}

// Hiển thị danh sách món ăn
function showMeals(meals) {
    const list = document.getElementById("api-meal-list");
    const status = document.getElementById("api-status");

    if (!list || !status) return;

    if (!meals || !meals.length) {
        list.innerHTML = "";
        status.textContent =
            "Không tìm thấy món ăn. Hãy thử từ khóa tiếng Anh khác nhé.";
        return;
    }

    status.textContent = `Tìm thấy ${meals.length} món ăn.`;

    list.innerHTML = meals.map(meal => `
        <div class="col-md-4 col-sm-6">
            <div class="card food-card api-food-card h-100">
                <img
                    src="${safeText(meal.strMealThumb)}"
                    class="card-img-top"
                    alt="${safeText(meal.strMeal)}"
                    loading="lazy"
                >

                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">
                        ${safeText(meal.strMeal)}
                    </h5>

                    <p class="text-muted small">
                        ${safeText(meal.strCategory || "Món ăn")}
                        ${meal.strArea ? " • " + safeText(meal.strArea) : ""}
                    </p>

                    <p>${mealRating(meal.idMeal)}</p>

                    <button
                        class="btn btn-orange mt-auto"
                        type="button"
                        data-meal-id="${safeText(meal.idMeal)}"
                    >
                        Chi tiết & đánh giá
                    </button>
                </div>
            </div>
        </div>
    `).join("");

    list.querySelectorAll("[data-meal-id]").forEach(button => {
        button.addEventListener("click", () => {
            openMeal(button.dataset.mealId);
        });
    });
}

// Tìm kiếm món ăn
async function searchMeals(term = "chicken") {
    const status = document.getElementById("api-status");
    const list = document.getElementById("api-meal-list");

    if (!status || !list) return;

    list.innerHTML = "";
    status.textContent = "Đang tải dữ liệu món ăn...";

    try {
        const response = await fetch(
            MEAL_API + "search.php?s=" + encodeURIComponent(term)
        );

        if (!response.ok) {
            throw new Error("Không thể kết nối API.");
        }

        const data = await response.json();
        showMeals(data.meals);

    } catch (error) {
        status.textContent =
            "Không tải được dữ liệu. Hãy kiểm tra Internet và thử lại.";

        console.error("Lỗi tìm kiếm món ăn:", error);
    }
}

// Xem chi tiết món ăn
async function openMeal(id) {
    try {
        const response = await fetch(
            MEAL_API + "lookup.php?i=" + encodeURIComponent(id)
        );

        if (!response.ok) {
            throw new Error("API không phản hồi.");
        }

        const data = await response.json();
        selectedMeal = data.meals?.[0];

        if (!selectedMeal) {
            throw new Error("Không tìm thấy thông tin món ăn.");
        }

        // Lấy nguyên liệu
        const ingredients = [];

        for (let i = 1; i <= 20; i++) {
            const item = selectedMeal["strIngredient" + i];
            const measure = selectedMeal["strMeasure" + i];

            if (item && item.trim()) {
                ingredients.push(`
                    <li>${safeText(measure)} ${safeText(item)}</li>
                `);
            }
        }

        const title = document.getElementById("review-meal-title");
        const detail = document.getElementById("review-meal-detail");
        const comment = document.getElementById("review-comment");
        const modalElement = document.getElementById("mealReviewModal");

        if (!title || !detail || !comment || !modalElement) {
            throw new Error("Thiếu thành phần HTML của cửa sổ chi tiết.");
        }

        title.textContent = selectedMeal.strMeal;

        detail.innerHTML = `
            <div class="row g-3">
                <div class="col-md-5">
                    <img
                        class="img-fluid rounded"
                        src="${safeText(selectedMeal.strMealThumb)}"
                        alt="${safeText(selectedMeal.strMeal)}"
                    >
                </div>

                <div class="col-md-7">
                    <p>
                        <b>Danh mục:</b>
                        ${safeText(selectedMeal.strCategory || "Chưa rõ")}
                    </p>

                    <p>
                        <b>Xuất xứ:</b>
                        ${safeText(selectedMeal.strArea || "Chưa rõ")}
                    </p>

                    <b>Nguyên liệu:</b>
                    <ul>${ingredients.join("")}</ul>

                    ${
                        selectedMeal.strSource
                        ? `<a href="${safeText(selectedMeal.strSource)}"
                             target="_blank" rel="noopener">
                             Nguồn công thức
                           </a>`
                        : ""
                    }
                </div>
            </div>

            <div class="mt-3">
                <b>Cách chế biến:</b>
                <p class="recipe-instructions">
                    ${safeText(
                        selectedMeal.strInstructions || "Chưa có thông tin"
                    )}
                </p>
            </div>
        `;

        comment.value = "";

        renderReviews();

        // Kiểm tra Bootstrap
        if (!window.bootstrap || !bootstrap.Modal) {
            throw new Error("Chưa tải Bootstrap JavaScript.");
        }

        bootstrap.Modal
            .getOrCreateInstance(modalElement)
            .show();

    } catch (error) {
        alert(
            "Không thể tải chi tiết món ăn. Vui lòng thử lại."
        );

        console.error("Lỗi xem chi tiết:", error);
    }
}

// Hiển thị đánh giá
function renderReviews() {
    const box = document.getElementById("review-list");

    if (!box || !selectedMeal) return;

    const reviews =
        readReviews()[selectedMeal.idMeal] || [];

    if (!reviews.length) {
        box.innerHTML =
            '<p class="text-muted">Chưa có đánh giá nào.</p>';
        return;
    }

    box.innerHTML = reviews.slice().reverse().map(review => `
        <div class="review-item">
            <div class="d-flex justify-content-between flex-wrap">
                <b>${safeText(review.name)}</b>

                <span class="rating-stars">
                    ${"★".repeat(review.stars)}
                    ${"☆".repeat(5 - review.stars)}
                </span>
            </div>

            <p class="mb-1">${safeText(review.comment)}</p>

            <small class="text-muted">
                ${safeText(review.date)}
            </small>
        </div>
    `).join("");
}

// Lưu đánh giá
function saveReview() {
    if (!selectedMeal) return;

    const commentInput =
        document.getElementById("review-comment");

    const starsInput =
        document.getElementById("review-stars");

    const comment = commentInput.value.trim();
    const stars = Number(starsInput.value);

    if (!comment) {
        alert("Bạn hãy nhập nhận xét trước khi gửi.");
        return;
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        alert("Vui lòng chọn số sao từ 1 đến 5.");
        return;
    }

    const allReviews = readReviews();

    if (!allReviews[selectedMeal.idMeal]) {
        allReviews[selectedMeal.idMeal] = [];
    }

    allReviews[selectedMeal.idMeal].push({
        stars: stars,
        comment: comment,
        name: "Khách hàng",
        date: new Date().toLocaleString("vi-VN")
    });

    localStorage.setItem(
        REVIEW_KEY,
        JSON.stringify(allReviews)
    );

    commentInput.value = "";

    renderReviews();

    // Cập nhật điểm đánh giá trên danh sách
    searchMeals(
        document.getElementById("meal-search").value.trim() || "chicken"
    );
}

// Khởi chạy khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("meal-search");
    const searchButton = document.getElementById("meal-search-btn");
    const submitButton = document.getElementById("submit-review");

    if (!input || !searchButton) {
        console.error("Không tìm thấy ô tìm kiếm món ăn.");
        return;
    }

    searchButton.addEventListener("click", () => {
        searchMeals(input.value.trim() || "chicken");
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchMeals(input.value.trim() || "chicken");
        }
    });

    submitButton?.addEventListener("click", saveReview);

    searchMeals("chicken");
});
