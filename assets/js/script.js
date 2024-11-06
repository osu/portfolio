"use strict";

// element toggle function
const elementToggleFunc = function (elem) {
  elem.classList.toggle("active");
};

// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () {
  elementToggleFunc(sidebar);
});

// mobile sidebar clicked by default
sidebarBtn.click();

// auto scrolling Tech Skills
const list = document.querySelector(".technologies-list");
const listItems = list.querySelectorAll(".technologies-item");
const scrollSpeed = 0.7; // speed
const intervalDuration = 10; // smoothness
const totalWidth = list.scrollWidth - list.clientWidth;
let scrollPosition = 0;
let scrolling = false;

function startScrolling() {
  if (!scrolling) {
    scrolling = true;
    const interval = setInterval(() => {
      scrollPosition += scrollSpeed;

      if (scrollPosition >= totalWidth) {
        scrollPosition = 0;
      }

      if (!scrolling) {
        clearInterval(interval);
      }

      list.scrollLeft = scrollPosition;
    }, intervalDuration);
  }
}

function stopScrolling() {
  scrolling = false;
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        startScrolling();
      } else {
        stopScrolling();
      }
    });
  },
  { threshold: 0 }
);

observer.observe(list);

list.addEventListener("mouseenter", () => {
  stopScrolling();
});

list.addEventListener("mouseleave", () => {
  startScrolling();
});

// variables
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

// modal toggle function
const testimonialsModalFunc = function () {
  modalContainer.classList.toggle("active");
  overlay.classList.toggle("active");
};

// add click event to all modal items
for (let i = 0; i < testimonialsItem.length; i++) {
  testimonialsItem[i].addEventListener("click", function () {
    modalImg.src = this.querySelector("[data-testimonials-avatar]").src;
    modalImg.alt = this.querySelector("[data-testimonials-avatar]").alt;
    modalTitle.innerHTML = this.querySelector(
      "[data-testimonials-title]"
    ).innerHTML;
    modalText.innerHTML = this.querySelector(
      "[data-testimonials-text]"
    ).innerHTML;

    testimonialsModalFunc();
  });
}

// add click event to modal close button
modalCloseBtn.addEventListener("click", testimonialsModalFunc);
overlay.addEventListener("click", testimonialsModalFunc);

// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () {
  elementToggleFunc(this);
});

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {
  filterItems.forEach((item) => {
    const categories = item.dataset.category.split(" ");
    if (selectedValue === "all" || categories.includes(selectedValue)) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
};

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {
  filterBtn[i].addEventListener("click", function () {
    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
}

// contact form variables
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {
    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
}

// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {
    const targetSection = this.getAttribute("data-target-section")
      ? this.getAttribute("data-target-section")
      : this.innerHTML.toLowerCase();

    for (let i = 0; i < pages.length; i++) {
      if (targetSection === pages[i].dataset.page) {
        pages[i].classList.add("active");

        if (navigationLinks[i]) {
          navigationLinks[i].classList.add("active");
        }
        window.scrollTo(0, 0);
      } else {
        pages[i].classList.remove("active");

        if (navigationLinks[i]) {
          navigationLinks[i].classList.remove("active");
        }
      }
    }
  });
}

// open certificates on click
function imgWindow() {
  window.open("image");
}

// copy email address
function copyEmail(e) {
  var email = document.querySelector(".email-text");
  var range = document.createRange();
  range.selectNode(email);
  window.getSelection().addRange(range);
  document.execCommand("copy");
  window.getSelection().removeAllRanges();
  e.target.innerText = "Copied";
  setTimeout(() => {
    e.target.innerText = "Copy";
  }, 300);
}

// Animated percentage bar
function increaseProgress(element, targetWidth) {
  var currentWidth = 0;
  var increment = 1;
  var interval = 10;

  var timer = setInterval(function () {
    currentWidth += increment;
    element.style.width = currentWidth + "%";
    if (currentWidth >= targetWidth) {
      clearInterval(timer);
    }
  }, interval);
}

function startAnimationOnScroll() {
  var progressFillElements = document.querySelectorAll(
    ".languages-progress-fill"
  );

  var options = {
    root: null,
    rootMargin: "0px",
    threshold: 0.5,
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var targetWidth = parseInt(entry.target.style.width);
        increaseProgress(entry.target, targetWidth);
        observer.unobserve(entry.target);
      }
    });
  }, options);

  progressFillElements.forEach(function (element) {
    observer.observe(element);
  });
}

startAnimationOnScroll();

// Loading Animation
window.addEventListener("DOMContentLoaded", (event) => {
  const imageContainers = document.querySelectorAll(".project-img");
  imageContainers.forEach((container) => {
    const image = container.querySelector("img");
    image.addEventListener("load", function () {
      container.classList.remove("loading");
    });
  });
});

// Age Counter Animation
function countTo(target, duration) {
  const start = 0;
  const increment = (target / duration) * 50;

  let current = start;
  const timer = setInterval(function () {
    current += increment;
    document.getElementById("age").textContent =
      Math.floor(current) + " years old";

    if (current >= target) {
      clearInterval(timer);
      document.getElementById("age").textContent = target + " years old";
    }
  }, 50);
}

function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

const ageElement = document.getElementById("age");
ageElement.textContent = "0 years old";

setTimeout(function () {
  countTo(calculateAge("2004-04-08"), 1000);
}, 1000);

// Motto Animation
const text = Array.from({ length: 20 }, () =>
  Array.from({ length: 16 }, () => Math.round(Math.random())).join("")
);

// Add your final phrases
text.push("Cogito, ergo sum");
text.push("I think, therefore I AM");

const mottoElement = document.getElementById("motto");
let index = 0;
let intervalId;

function flipmotto() {
  mottoElement.textContent = text[index];

  // Once we reach "Cogito, ergo sum", pause for 4 seconds before switching to the next phrase
  if (text[index] === "Cogito, ergo sum") {
    clearInterval(intervalId); // Clear the current interval
    setTimeout(() => {
      index++;
      mottoElement.textContent = text[index]; // Show "I think, therefore I am"
    }, 4000); // Wait for 4 seconds before showing the next message
  } else if (text[index] === "I think, therefore I AM") {
    clearInterval(intervalId); // Stop the interval once the final message is shown
  } else {
    index++;
  }
}

// Start with random numbers, flipping every 0.1 seconds (100 ms)
intervalId = setInterval(flipmotto, 100);


// Expanding About Text
function toggleText() {
  var moreText = document.getElementById("more");
  var btnText = document.getElementById("toggle-button");

  if (moreText.style.display === "none") {
    moreText.style.display = "block";
    btnText.innerHTML = "&uarr; &nbsp; &nbsp; Hide text &nbsp; &nbsp; &uarr;";
  } else {
    moreText.style.display = "none";
    btnText.innerHTML = "&darr; &nbsp; &nbsp; Show more &nbsp; &nbsp; &darr;";
  }
}

// Turn image alt text into title

document.addEventListener("DOMContentLoaded", function () {
  const items = document.querySelectorAll(".technologies-item");

  items.forEach((item) => {
    const image = item.querySelector("img");
    const titleText = image.alt;
    const titleDiv = document.createElement("div");
    titleDiv.className = "image-title";
    titleDiv.textContent = titleText;
    item.appendChild(titleDiv);
  });
});

// Lazy Loading on scroll for Projects

document.addEventListener("DOMContentLoaded", function () {
  let projectItems = document.querySelectorAll(".project-item");

  let observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          let img = entry.target.querySelector("img");
          img.src = img.getAttribute("data-src");
          img.classList.remove("loading");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  projectItems.forEach((item) => {
    observer.observe(item);
  });
});

document.addEventListener("DOMContentLoaded", function () {
  // Sidebar tilt effect
  const sidebar = document.querySelector(".sidebar");

  sidebar.addEventListener('mousemove', (e) => {
    const { width, height, left, top } = sidebar.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    // Adjust sidebar tilt intensity
    const rotateX = (y * 20).toFixed(2); // Tilt on X-axis
    const rotateY = (x * -20).toFixed(2); // Tilt on Y-axis

    // Apply the calculated rotation to the sidebar
    sidebar.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  // Reset the tilt effect when the mouse leaves the sidebar
  sidebar.addEventListener('mouseleave', () => {
    sidebar.style.transform = `rotateX(0deg) rotateY(0deg)`;
  });

  // Section tilt effect
  const tiltableSections = document.querySelectorAll(".tiltable-section");

  tiltableSections.forEach((section) => {
    section.addEventListener('mousemove', (e) => {
      const { width, height, left, top } = section.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;

      // Adjust section tilt intensity
      const rotateX = (y * 15).toFixed(2); // Tilt on X-axis for sections
      const rotateY = (x * -15).toFixed(2); // Tilt on Y-axis for sections

      // Apply the calculated rotation to the section
      section.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    // Reset the tilt effect when the mouse leaves the section
    section.addEventListener('mouseleave', () => {
      section.style.transform = `rotateX(0deg) rotateY(0deg)`;
    });
  });
  particlesJS("particles-js", {
  particles: {
    number: {
      value: 80,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: "#ffffff"
    },
    shape: {
      type: "circle",
      stroke: {
        width: 0,
        color: "#000000"
      },
      polygon: {
        nb_sides: 5
      }
    },
    opacity: {
      value: 0.5,
      random: false,
      anim: {
        enable: false,
        speed: 1,
        opacity_min: 0.1,
        sync: false
      }
    },
    size: {
      value: 5,
      random: true,
      anim: {
        enable: false,
        speed: 40,
        size_min: 0.1,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#ffffff",
      opacity: 0.4,
      width: 1
    },
    move: {
      enable: true,
      speed: 6,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200
      }
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: true,
        mode: "grab"
      },
      onclick: {
        enable: true,
        mode: "push"
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 140,
        line_linked: {
          opacity: 1
        }
      },
      bubble: {
        distance: 400,
        size: 40,
        duration: 2,
        opacity: 8,
        speed: 3
      },
      repulse: {
        distance: 200,
        duration: 0.4
      },
      push: {
        particles_nb: 4
      },
      remove: {
        particles_nb: 2
      }
    }
  },
  retina_detect: true
});
});
