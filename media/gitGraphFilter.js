(function () {
  const hashInput = document.getElementById("filter-hash");
  const messageInput = document.getElementById("filter-message");
  const authorInput = document.getElementById("filter-author");
  const dateFromInput = document.getElementById("filter-date-from");
  const dateToInput = document.getElementById("filter-date-to");
  const clearBtn = document.getElementById("filter-clear");
  const commitsContainer = document.getElementById("commits-container");

  function getRows() {
    return Array.from(commitsContainer.querySelectorAll(".commit-row"));
  }

  function isFiltering() {
    return (
      hashInput.value ||
      messageInput.value ||
      authorInput.value ||
      dateFromInput.value ||
      dateToInput.value
    );
  }

  function applyFilters() {
    const hash = hashInput.value.trim().toLowerCase();
    const message = messageInput.value.trim().toLowerCase();
    const author = authorInput.value.trim().toLowerCase();
    const dateFrom = dateFromInput.value ? new Date(dateFromInput.value) : null;
    const dateTo = dateToInput.value ? new Date(dateToInput.value) : null;

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    const filtering = isFiltering();

    // Toggle graph column visibility
    document.querySelectorAll(".col-graph").forEach((el) => {
      el.style.display = filtering ? "none" : "";
    });

    let visibleCount = 0;

    getRows().forEach((row) => {
      const rowHash = (
        row.querySelector(".hash")?.textContent ?? ""
      ).toLowerCase();
      const rowMessage = (
        row.querySelector(".message")?.textContent ?? ""
      ).toLowerCase();
      const rowAuthor = (
        row.querySelector(".author")?.textContent ?? ""
      ).toLowerCase();
      const rowDateText = (
        row.querySelector(".date")?.textContent ?? ""
      ).trim();
      const rowDate = rowDateText ? new Date(rowDateText) : null;

      const matchesHash = !hash || rowHash.includes(hash);
      const matchesMessage = !message || rowMessage.includes(message);
      const matchesAuthor = !author || rowAuthor.includes(author);
      const matchesDateFrom = !dateFrom || (rowDate && rowDate >= dateFrom);
      const matchesDateTo = !dateTo || (rowDate && rowDate <= dateTo);

      const visible =
        matchesHash &&
        matchesMessage &&
        matchesAuthor &&
        matchesDateFrom &&
        matchesDateTo;

      row.style.display = visible ? "" : "none";

      if (visible) {
        visibleCount++;
      }
    });

    updateResultCount(visibleCount);
  }

  function updateResultCount(count) {
    let counter = document.getElementById("filter-result-count");
    if (!counter) {
      counter = document.createElement("span");
      counter.id = "filter-result-count";
      document.getElementById("filter-bar").appendChild(counter);
    }
    const total = getRows().length;
    counter.textContent = isFiltering() ? `${count} of ${total} commits` : "";
  }

  function clearFilters() {
    hashInput.value = "";
    messageInput.value = "";
    authorInput.value = "";
    dateFromInput.value = "";
    dateToInput.value = "";
    applyFilters();
  }

  hashInput.addEventListener("input", applyFilters);
  messageInput.addEventListener("input", applyFilters);
  authorInput.addEventListener("input", applyFilters);
  dateFromInput.addEventListener("input", applyFilters);
  dateToInput.addEventListener("input", applyFilters);
  clearBtn.addEventListener("click", clearFilters);
})();
