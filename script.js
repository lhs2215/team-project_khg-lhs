const COURSE_KEY = "erica-credit-courses-v1";
const RESIDENCE_KEY = "erica-credit-residence-v1";

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable in private contexts. */ }
}

function formatCredits(value) {
  return Number(value || 0).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

const categoryLabels = { major: "전공", general: "교양", other: "기타" };
const gradePoints = { F: 0, D: 1, "D+": 1.5, C: 2, "C+": 2.5, B: 3, "B+": 3.5, A: 4, "A+": 4.5 };
let courses = readStorage(COURSE_KEY, []);
if (!Array.isArray(courses)) courses = [];

const entryRows = document.querySelector("#course-entry-rows");

function createCourseEntryRow() {
  const row = document.createElement("div");
  row.className = "course-entry-row";
  row.innerHTML = `
    <label class="entry-field entry-name-field"><span class="sr-only">과목명</span><input class="entry-name" type="text" maxlength="60" placeholder="예: 전공기초프로그래밍"></label>
    <label class="entry-field entry-credits-field"><span class="sr-only">학점</span><select class="entry-credits"><option value="" selected>학점</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
    <label class="entry-field entry-category-field"><span class="sr-only">이수 구분</span><select class="entry-category"><option value="major">전공</option><option value="general">교양</option></select></label>
    <label class="entry-field entry-grade-field"><span class="sr-only">취득 등급</span><select class="entry-grade"><option value="" selected>등급</option><option value="F">F</option><option value="D">D</option><option value="D+">D+</option><option value="C">C</option><option value="C+">C+</option><option value="B">B</option><option value="B+">B+</option><option value="A">A</option><option value="A+">A+</option><option value="P">P</option><option value="NP">NP</option></select></label>
    <button class="remove-entry-button" type="button" aria-label="입력 칸 삭제">×</button>`;
  const fields = [...row.querySelectorAll("input,select")];
  fields.forEach((field) => {
    field.addEventListener("input", () => {
      const hasAnyValue = row.querySelector(".entry-name").value.trim() !== "" || row.querySelector(".entry-credits").value !== "" || row.querySelector(".entry-grade").value !== "";
      fields.forEach((item) => { item.required = hasAnyValue; });
    });
    field.addEventListener("change", () => {
      const hasAnyValue = row.querySelector(".entry-name").value.trim() !== "" || row.querySelector(".entry-credits").value !== "" || row.querySelector(".entry-grade").value !== "";
      fields.forEach((item) => { item.required = hasAnyValue; });
    });
  });
  row.querySelector(".remove-entry-button").addEventListener("click", () => {
    if (entryRows.children.length > 1) row.remove();
  });
  return row;
}

function addCourseEntryRow() {
  entryRows?.append(createCourseEntryRow());
}

if (entryRows) {
  for (let index = 0; index < 3; index += 1) addCourseEntryRow();
  document.querySelector("#add-course-row")?.addEventListener("click", addCourseEntryRow);
}

function getCreditTotals() {
  const earnedCourses = courses.filter((course) => course.grade !== "NP" && course.grade !== "F");
  const total = earnedCourses.reduce((sum, course) => sum + Number(course.credits || 0), 0);
  const major = earnedCourses.filter((course) => course.category === "major").reduce((sum, course) => sum + Number(course.credits || 0), 0);
  return { total, major };
}

function getGpa(courseSet) {
  const included = courseSet.filter((course) => Object.hasOwn(gradePoints, course.grade));
  const denominator = included.reduce((sum, course) => sum + Number(course.credits || 0), 0);
  if (denominator <= 0) return "—";
  const weightedPoints = included.reduce((sum, course) => sum + gradePoints[course.grade] * Number(course.credits || 0), 0);
  return (Math.round((weightedPoints / denominator + Number.EPSILON) * 100) / 100).toFixed(2);
}

function renderCreditTotals() {
  const { total, major } = getCreditTotals();
  const totalNode = document.querySelector("#total-credits");
  const majorNode = document.querySelector("#major-credits");
  const residenceTotal = document.querySelector("#residence-total");
  const residenceMajor = document.querySelector("#residence-major");
  const overallGpa = document.querySelector("#overall-gpa");
  const majorGpa = document.querySelector("#major-gpa");
  if (totalNode) totalNode.textContent = formatCredits(total);
  if (majorNode) majorNode.textContent = formatCredits(major);
  if (residenceTotal) residenceTotal.textContent = formatCredits(total);
  if (residenceMajor) residenceMajor.textContent = formatCredits(major);
  if (overallGpa) overallGpa.textContent = getGpa(courses);
  if (majorGpa) majorGpa.textContent = getGpa(courses.filter((course) => course.category === "major"));
}

function renderCourses() {
  const list = document.querySelector("#course-list");
  if (!list) {
    renderCreditTotals();
    return;
  }
  list.replaceChildren();
  const emptyState = document.querySelector("#empty-state");
  emptyState.hidden = courses.length > 0;

  courses.forEach((course) => {
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const yearTerm = document.createElement("td");
    const category = document.createElement("td");
    const grade = document.createElement("td");
    const credits = document.createElement("td");
    const action = document.createElement("td");
    const categoryTag = document.createElement("span");
    const remove = document.createElement("button");

    name.textContent = course.name;
    yearTerm.textContent = course.year && course.term ? `${course.year}학년 ${course.term}학기` : "—";
    categoryTag.className = `category-tag category-${course.category}`;
    categoryTag.textContent = categoryLabels[course.category] || "기타";
    category.append(categoryTag);
    grade.textContent = course.grade || "—";
    credits.textContent = `${formatCredits(course.credits)}학점`;
    remove.type = "button";
    remove.className = "remove-course";
    remove.textContent = "삭제";
    remove.setAttribute("aria-label", `${course.name} 과목 삭제`);
    remove.addEventListener("click", () => {
      courses = courses.filter((item) => item.id !== course.id);
      writeStorage(COURSE_KEY, courses);
      renderCourses();
    });
    action.append(remove);
    row.append(name, yearTerm, category, grade, credits, action);
    list.append(row);
  });

  const countNode = document.querySelector("#course-count");
  if (countNode) countNode.textContent = `${courses.length}개 과목`;
  renderCreditTotals();
}

document.querySelector("#course-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const year = document.querySelector("#batch-year").value;
  const term = document.querySelector("#batch-term").value;
  const entries = [...document.querySelectorAll(".course-entry-row")].map((row) => ({
    name: row.querySelector(".entry-name").value.trim(),
    credits: row.querySelector(".entry-credits").value,
    category: row.querySelector(".entry-category").value,
    grade: row.querySelector(".entry-grade").value,
    fields: [...row.querySelectorAll("input,select")],
  }));
  const activeEntries = entries.filter((entry) => entry.name || entry.credits || entry.grade);
  if (activeEntries.length === 0) {
    const firstName = document.querySelector(".entry-name");
    firstName.required = true;
    firstName.reportValidity();
    firstName.required = false;
    return;
  }
  activeEntries.forEach((entry) => entry.fields.forEach((field) => { field.required = true; }));
  if (!form.reportValidity()) return;

  courses.push(...activeEntries.map((entry) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: entry.name,
    credits: Number(entry.credits),
    category: entry.category,
    grade: entry.grade,
    gradePoints: Object.hasOwn(gradePoints, entry.grade) ? gradePoints[entry.grade] : null,
    year,
    term,
  })));
  writeStorage(COURSE_KEY, courses);
  entryRows.querySelectorAll(".course-entry-row").forEach((row) => {
    row.querySelector(".entry-name").value = "";
    row.querySelector(".entry-credits").value = "";
    row.querySelector(".entry-category").value = "major";
    row.querySelector(".entry-grade").value = "";
    row.querySelectorAll("input,select").forEach((field) => { field.required = false; });
  });
  document.querySelector(".entry-name")?.focus();
  renderCourses();
});

document.querySelector("#clear-courses")?.addEventListener("click", () => {
  courses = [];
  writeStorage(COURSE_KEY, courses);
  renderCourses();
});

const residenceForm = document.querySelector("#residence-form");
const residenceArea = document.querySelector("#residence-area");
const savedResidence = readStorage(RESIDENCE_KEY, {});
if (residenceArea && typeof savedResidence.area === "string") residenceArea.value = savedResidence.area;

function renderResidenceArea() {
  const areaOutput = document.querySelector("#residence-result-area");
  if (areaOutput) areaOutput.textContent = residenceArea?.value.trim() || "거주지역을 입력해 주세요";
}

residenceForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const area = residenceArea.value.trim();
  if (!area) return;
  writeStorage(RESIDENCE_KEY, { area });
  renderResidenceArea();
});

if (residenceArea) renderResidenceArea();

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
    observer.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

renderCourses();
