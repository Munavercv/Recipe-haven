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
// ================================================= dropdown



// ============================================ fixed nav
// window.onscroll = function() { addFixedNav() };

// function addFixedNav() {
//     const nav = document.getElementById("fixedNav");

//     if (window.scrollY > 40) {
//         nav.classList.add("fixed-top", "nav-fixed");
//     } else {
//         nav.classList.remove("fixed-top", "nav-fixed");
//     }
// }
// ============================================ fixed nav



// ============================================ page back
function goBack() {
    window.history.back();
}
// ============================================ page back



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
// ========================================================== cuisine slider