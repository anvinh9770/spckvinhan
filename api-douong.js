
const DRINK_API = "https://www.thecocktaildb.com/api/json/v1/1/";
const DRINK_REVIEW_KEY = "foodMenuDrinkReviews";

let selectedDrink = null;

// Chuyển nội dung thành văn bản an toàn
function drinkSafeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));
}

// Đọc đánh giá
function readDrinkReviews() {
    try {
        return JSON.parse(localStorage.getItem(DRINK_REVIEW_KEY)) || {};
    } catch {
        return {};
    }
}

// Tính điểm đánh giá
function drinkRating(id) {
    const reviews = readDrinkReviews()[id] || [];

    if (!reviews.length) {
        return '<span class="text-muted">Chưa có đánh giá</span>';
    }

    const avg = reviews.reduce(
        (sum, review) => sum + Number(review.stars), 0
    ) / reviews.length;

    return `<span class="rating-stars">★</span>
            ${avg.toFixed(1)}/5 (${reviews.length} đánh giá)`;
}

// Hiển thị danh sách đồ uống
function showDrinks(drinks) {
    const list = document.getElementById("api-drink-list");
    const status = document.getElementById("drink-api-status");

    if (!list || !status) return;

    if (!drinks || !drinks.length) {
        list.innerHTML = "";
        status.textContent = "Không tìm thấy đồ uống. Hãy thử từ khóa tiếng Anh khác.";
        return;
    }

    status.textContent = `Tìm thấy ${drinks.length} thức uống.`;

    list.innerHTML = drinks.map(drink => `
        <div class="col-md-4 col-sm-6">
            <div class="card food-card h-100">
                <img
                    src="${drinkSafeText(drink.strDrinkThumb)}"
                    class="card-img-top"
                    alt="${drinkSafeText(drink.strDrink)}"
                    loading="lazy"
                >

                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">
                        ${drinkSafeText(drink.strDrink)}
                    </h5>

                    <p class="text-muted small">
                        ${drinkSafeText(drink.strCategory || "Đồ uống")}
                    </p>

                    <p>${drinkRating(drink.idDrink)}</p>

                    <button
                        class="btn btn-orange mt-auto"
                        type="button"
                        data-drink-id="${drinkSafeText(drink.idDrink)}"
                    >
                        Chi tiết & đánh giá
                    </button>
                </div>
            </div>
        </div>
    `).join("");

    list.querySelectorAll("[data-drink-id]").forEach(button => {
        button.addEventListener("click", () => {
            openDrink(button.dataset.drinkId);
        });
    });
}

// Tìm kiếm đồ uống
async function searchDrinks(term = "") {
    const status = document.getElementById("drink-api-status");
    const list = document.getElementById("api-drink-list");

    if (!status || !list) return;

    list.innerHTML = "";
    status.textContent = "Đang tải dữ liệu đồ uống...";

    try {
        let url;

        if (term.trim()) {
            url = DRINK_API + "search.php?s=" + encodeURIComponent(term);
        } else {
            url = DRINK_API + "filter.php?a=Non_Alcoholic";
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Không thể kết nối API.");
        }

        const data = await response.json();
        showDrinks(data.drinks);

    } catch (error) {
        status.textContent =
            "Không tải được đồ uống. Hãy kiểm tra Internet và thử lại.";

        console.error("Lỗi API đồ uống:", error);
    }
}

// Xem chi tiết đồ uống
async function openDrink(id) {
    try {
        const response = await fetch(
            DRINK_API + "lookup.php?i=" + encodeURIComponent(id)
        );

        if (!response.ok) {
            throw new Error("API không phản hồi.");
        }

        const data = await response.json();
        selectedDrink = data.drinks?.[0];

        if (!selectedDrink) {
            throw new Error("Không tìm thấy đồ uống.");
        }

        // Lấy nguyên liệu
        const ingredients = [];

        for (let i = 1; i <= 15; i++) {
            const item = selectedDrink["strIngredient" + i];
            const measure = selectedDrink["strMeasure" + i];

            if (item && item.trim()) {
                ingredients.push(`
                    <li>${drinkSafeText(measure)} ${drinkSafeText(item)}</li>
                `);
            }
        }

        const title = document.getElementById("drink-review-title");
        const detail = document.getElementById("drink-review-detail");
        const comment = document.getElementById("drink-review-comment");
        const modalElement = document.getElementById("drinkReviewModal");

        if (!title || !detail || !comment || !modalElement) {
            throw new Error("Thiếu thành phần HTML của cửa sổ chi tiết.");
        }

        title.textContent = selectedDrink.strDrink;

        detail.innerHTML = `
            <div class="row g-3">
                <div class="col-md-5">
                    <img
                        class="img-fluid rounded"
                        src="${drinkSafeText(selectedDrink.strDrinkThumb)}"
                        alt="${drinkSafeText(selectedDrink.strDrink)}"
                    >
                </div>

                <div class="col-md-7">
                    <p>
                        <b>Danh mục:</b>
                        ${drinkSafeText(selectedDrink.strCategory || "Chưa rõ")}
                    </p>

                    <p>
                        <b>Loại ly:</b>
                        ${drinkSafeText(selectedDrink.strGlass || "Chưa rõ")}
                    </p>

                    <p>
                        <b>Loại thức uống:</b>
                        ${drinkSafeText(selectedDrink.strAlcoholic || "Chưa rõ")}
                    </p>

                    <b>Nguyên liệu:</b>
                    <ul>${ingredients.join("")}</ul>
                </div>
            </div>

            <div class="mt-3">
                <b>Cách pha chế:</b>
                <p class="recipe-instructions">
                    ${drinkSafeText(selectedDrink.strInstructions || "Chưa có thông tin")}
                </p>
            </div>
        `;

        comment.value = "";
        renderDrinkReviews();

        if (!window.bootstrap || !bootstrap.Modal) {
            throw new Error("Chưa tải Bootstrap JavaScript.");
        }

        bootstrap.Modal
            .getOrCreateInstance(modalElement)
            .show();

    } catch (error) {
        alert("Không thể tải chi tiết đồ uống. Vui lòng thử lại.");
        console.error("Lỗi xem chi tiết đồ uống:", error);
    }
}

// Hiển thị đánh giá
function renderDrinkReviews() {
    const box = document.getElementById("drink-review-list");

    if (!box || !selectedDrink) return;

    const reviews =
        readDrinkReviews()[selectedDrink.idDrink] || [];

    if (!reviews.length) {
        box.innerHTML =
            '<p class="text-muted">Chưa có đánh giá nào.</p>';
        return;
    }

    box.innerHTML = reviews.slice().reverse().map(review => `
        <div class="review-item">
            <div class="d-flex justify-content-between flex-wrap">
                <b>${drinkSafeText(review.name)}</b>

                <span class="rating-stars">
                    ${"★".repeat(review.stars)}
                    ${"☆".repeat(5 - review.stars)}
                </span>
            </div>

            <p class="mb-1">${drinkSafeText(review.comment)}</p>

            <small class="text-muted">
                ${drinkSafeText(review.date)}
            </small>
        </div>
    `).join("");
}

// Lưu đánh giá
function saveDrinkReview() {
    if (!selectedDrink) return;

    const commentInput =
        document.getElementById("drink-review-comment");

    const starsInput =
        document.getElementById("drink-review-stars");

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

    const allReviews = readDrinkReviews();

    if (!allReviews[selectedDrink.idDrink]) {
        allReviews[selectedDrink.idDrink] = [];
    }

    allReviews[selectedDrink.idDrink].push({
        stars: stars,
        comment: comment,
        name: "Khách hàng",
        date: new Date().toLocaleString("vi-VN")
    });

    localStorage.setItem(
        DRINK_REVIEW_KEY,
        JSON.stringify(allReviews)
    );

    commentInput.value = "";
    renderDrinkReviews();

    // Cập nhật điểm đánh giá trên danh sách
    const searchInput = document.getElementById("drink-search");
    searchDrinks(searchInput?.value.trim() || "");
}

// Khởi chạy khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("drink-search");
    const searchButton = document.getElementById("drink-search-btn");
    const submitButton = document.getElementById("drink-submit-review");

    if (!input || !searchButton) {
        console.error("Không tìm thấy thành phần tìm kiếm đồ uống.");
        return;
    }

    searchButton.addEventListener("click", () => {
        searchDrinks(input.value.trim());
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchDrinks(input.value.trim());
        }
    });

    submitButton?.addEventListener("click", saveDrinkReview);

    // Mặc định tải danh sách đồ uống không cồn
    searchDrinks("");
});
