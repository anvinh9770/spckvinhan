
const VEG_API = "https://www.themealdb.com/api/json/v1/1/";
const VEG_REVIEW_KEY = "foodMenuVegetarianReviews";

let selectedVegetarian = null;

function vegSafe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function readVegetarianReviews() {
    try {
        return JSON.parse(localStorage.getItem(VEG_REVIEW_KEY)) || {};
    } catch {
        return {};
    }
}

function vegetarianRating(id) {
    const reviews = readVegetarianReviews()[id] || [];

    if (!reviews.length) {
        return "Chưa có đánh giá";
    }

    const average = reviews.reduce(
        (sum, review) => sum + Number(review.stars), 0
    ) / reviews.length;

    return `⭐ ${average.toFixed(1)}/5 (${reviews.length} đánh giá)`;
}

// Hiển thị danh sách món chay
function showVegetarianMeals(meals) {
    const list = document.getElementById("vegetarian-list");
    const status = document.getElementById("vegetarian-status");

    if (!list || !status) return;

    if (!meals || meals.length === 0) {
        list.innerHTML = "";
        status.textContent = "Không tìm thấy món chay phù hợp.";
        return;
    }

    status.textContent = `Tìm thấy ${meals.length} món chay.`;

    list.innerHTML = meals.map(meal => `
        <div class="col-md-4 col-sm-6">
            <div class="card food-card h-100">
                <img src="${vegSafe(meal.strMealThumb)}"
                     class="card-img-top"
                     alt="${vegSafe(meal.strMeal)}"
                     loading="lazy">

                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${vegSafe(meal.strMeal)}</h5>

                    <p class="small text-muted">
                        ${vegetarianRating(meal.idMeal)}
                    </p>

                    <button class="btn btn-warning mt-auto"
                            onclick="openVegetarianDetail('${vegSafe(meal.idMeal)}')">
                        Xem chi tiết
                    </button>
                </div>
            </div>
        </div>
    `).join("");
}

// Tải danh sách món chay và món thuần chay
async function loadVegetarianMeals() {
    const status = document.getElementById("vegetarian-status");

    try {
        status.textContent = "Đang tải dữ liệu...";

        const categories = ["Vegetarian", "Vegan"];

        const results = await Promise.all(
            categories.map(category =>
                fetch(`${VEG_API}filter.php?c=${category}`)
                    .then(response => {
                        if (!response.ok) throw new Error("API error");
                        return response.json();
                    })
            )
        );

        const allMeals = results.flatMap(result => result.meals || []);

        const uniqueMeals = [
            ...new Map(allMeals.map(meal => [meal.idMeal, meal])).values()
        ];

        showVegetarianMeals(uniqueMeals);

    } catch (error) {
        status.textContent = "Không thể tải món chay. Vui lòng thử lại sau.";
        console.error(error);
    }
}

// Tìm kiếm món chay
async function searchVegetarianMeals() {
    const keyword = document.getElementById("vegetarian-search").value.trim();
    const status = document.getElementById("vegetarian-status");

    if (!keyword) {
        loadVegetarianMeals();
        return;
    }

    try {
        status.textContent = "Đang tìm kiếm...";

        const response = await fetch(
            `${VEG_API}search.php?s=${encodeURIComponent(keyword)}`
        );

        if (!response.ok) throw new Error("API error");

        const data = await response.json();

        // Chỉ giữ món có danh mục Vegetarian hoặc Vegan
        const vegetarianMeals = (data.meals || []).filter(meal =>
            ["vegetarian", "vegan"].includes(
                String(meal.strCategory || "").toLowerCase()
            )
        );

        showVegetarianMeals(vegetarianMeals);

    } catch (error) {
        status.textContent = "Lỗi kết nối API. Hãy thử lại.";
        console.error(error);
    }
}

// Xem chi tiết món chay
async function openVegetarianDetail(id) {
    try {
        const response = await fetch(`${VEG_API}lookup.php?i=${id}`);
        if (!response.ok) throw new Error("API error");

        const data = await response.json();
        const meal = data.meals?.[0];

        if (!meal) return;

        selectedVegetarian = meal;

        const ingredients = [];

        for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`]?.trim();
            const measure = meal[`strMeasure${i}`]?.trim();

            if (ingredient) {
                ingredients.push(`
                    <li>${vegSafe(measure)} ${vegSafe(ingredient)}</li>
                `);
            }
        }

        const reviews = readVegetarianReviews()[id] || [];

        document.getElementById("vegetarian-modal-title").textContent =
            meal.strMeal;

        document.getElementById("vegetarian-modal-body").innerHTML = `
            <img src="${vegSafe(meal.strMealThumb)}"
                 class="img-fluid rounded mb-3"
                 alt="${vegSafe(meal.strMeal)}">

            <h5>🥬 Nguyên liệu</h5>
            <ul>${ingredients.join("")}</ul>

            <h5>👨‍🍳 Cách chế biến</h5>
            <p>${vegSafe(meal.strInstructions).replace(/\r?\n/g, "<br>")}</p>

            <hr>

            <h5>⭐ Đánh giá món ăn</h5>
            <p>${vegetarianRating(id)}</p>

            <label class="form-label">Chọn số sao:</label>
            <select class="form-select mb-2" id="vegetarian-stars">
                <option value="5">⭐⭐⭐⭐⭐ - Tuyệt vời</option>
                <option value="4">⭐⭐⭐⭐ - Tốt</option>
                <option value="3">⭐⭐⭐ - Bình thường</option>
                <option value="2">⭐⭐ - Chưa tốt</option>
                <option value="1">⭐ - Không thích</option>
            </select>

            <textarea class="form-control mb-2"
                      id="vegetarian-comment"
                      placeholder="Viết bình luận của bạn..."></textarea>

            <button class="btn btn-warning" onclick="saveVegetarianReview()">
                Gửi đánh giá
            </button>

            <h6 class="mt-4">💬 Bình luận</h6>
            <div>
                ${reviews.length ? reviews.map(review => `
                    <div class="border rounded p-2 mb-2">
                        <div> ${"⭐".repeat(review.stars)}</div>
                        <p class="mb-0">${vegSafe(review.comment || "Không có bình luận")}</p>
                    </div>
                `).join("") : '<p class="text-muted">Chưa có bình luận.</p>'}
            </div>
        `;

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("vegetarianModal")
        ).show();

    } catch (error) {
        alert("Không thể tải chi tiết món ăn.");
        console.error(error);
    }
}

// Lưu đánh giá
function saveVegetarianReview() {
    if (!selectedVegetarian) return;

    const stars = Number(
        document.getElementById("vegetarian-stars").value
    );

    const comment = document.getElementById("vegetarian-comment").value.trim();

    const reviews = readVegetarianReviews();
    const id = selectedVegetarian.idMeal;

    if (!reviews[id]) reviews[id] = [];

    reviews[id].push({
        stars,
        comment,
        date: new Date().toISOString()
    });

    localStorage.setItem(VEG_REVIEW_KEY, JSON.stringify(reviews));

    alert("Đánh giá của bạn đã được lưu!");

    openVegetarianDetail(id);
}

// Sự kiện tìm kiếm
document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("vegetarian-search-btn");
    const input = document.getElementById("vegetarian-search");

    button?.addEventListener("click", searchVegetarianMeals);

    input?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchVegetarianMeals();
        }
    });

    loadVegetarianMeals();
});
