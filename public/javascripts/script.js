// ================================================= dropdown
document.querySelector('.dropdown-toggle-btn').addEventListener('click', function () {
    const dropdown = this.parentElement;
    dropdown.classList.toggle('open');
});

// Close dropdown if clicked outside
window.addEventListener('click', function (e) {
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    dropdowns.forEach(function (dropdown) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
});
// =================================================



// ============================================ page back
function goBack() {
    window.history.back();
}
// ============================================



// ========================================================== cuisine slider
const swiper = new Swiper('.swiper-container', {
    slidesPerView: 5,
    spaceBetween: 0,
    loop: true,
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    breakpoints: {
        576: {
            slidesPerView: 5,
            spaceBetween: 20,
        },
        768: {
            slidesPerView: 4,
            spaceBetween: 30,
        },
        992: {
            slidesPerView: 5,
            spaceBetween: 0,
        },
        1200: {
            slidesPerView: 6,
            spaceBetween: 0,
        }
    }
});
// ==========================================================



// ========================================================= bookmark recipe
$(document).ready(function () {
    $('#bookmarkRecipe').click(function (e) {
        e.preventDefault();
        
        const recipeId = $(this).data('recipe-id');
        const isBookmarked = $(this).find('i').hasClass('fa-solid');

        if (isBookmarked) {
            $.ajax({
                url: `/unbookmark-recipe/${recipeId}`,
                type: 'DELETE',
                success: function (response) {
                    if (response.success) {
                        $('#bookmarkRecipe i').removeClass('fa-solid fa-bookmark').addClass('fa-regular fa-bookmark');
                    } else {
                        alert('Failed to unbookmark the recipe');
                    }
                }
            });
        } else {
            $.post(`/bookmark-recipe/${recipeId}`, function (response) {
                if (response.success) {
                    $('#bookmarkRecipe i').removeClass('fa-regular fa-bookmark').addClass('fa-solid fa-bookmark');
                } else {
                    alert('Failed to bookmark the recipe');
                }
            });
        }
    });
});
// =========================================================