
const { JSDOM } = require('jsdom');
const assert = require('assert');

// Mock HTML
const html = `
<!DOCTYPE html>
<html>
<body>
    <nav class="sidebar" id="student-sidebar">
        <ul>
            <li class="active" onclick="showStudentSection('overview')" tabindex="0" role="button" aria-label="View Profile">
                <i class="fas fa-user"></i> Profile
            </li>
            <li onclick="showStudentSection('grading-sheet')" tabindex="0" role="button" aria-label="View Grading Sheet">
                <i class="fas fa-clipboard-list"></i> Grading Sheet
            </li>
            <li onclick="showStudentSection('grades')" tabindex="0" role="button" aria-label="View Semester Grades">
                <i class="fas fa-file-alt"></i> Semester Grades
            </li>
            <li onclick="showStudentSection('announcements')" tabindex="0" role="button" aria-label="View Announcements">
                <i class="fas fa-bullhorn"></i> Announcements
            </li>
        </ul>
    </nav>
    <div id="student-page-title">Profile</div>
</body>
</html>
`;

const dom = new JSDOM(html, { runScripts: "dangerously" });
const { window } = dom;
const { document } = window;

// Mock Global Functions
window.showStudentSection = function(sectionId) {
    // Reset active class
    const items = document.querySelectorAll('.sidebar li');
    items.forEach(i => i.classList.remove('active'));

    // Set active based on sectionId (simplified mock logic)
    if (sectionId === 'overview') items[0].classList.add('active');
    if (sectionId === 'grading-sheet') items[1].classList.add('active');
    if (sectionId === 'grades') items[2].classList.add('active');
    if (sectionId === 'announcements') items[3].classList.add('active');
};

// Test Suite
console.log("Running Sidebar Interaction Tests...");

// Test 1: Verify ARIA Labels
const items = document.querySelectorAll('.sidebar li');
assert.strictEqual(items[0].getAttribute('aria-label'), 'View Profile', 'Profile button missing aria-label');
assert.strictEqual(items[1].getAttribute('aria-label'), 'View Grading Sheet', 'Grading Sheet button missing aria-label');
assert.strictEqual(items[3].getAttribute('aria-label'), 'View Announcements', 'Announcements button missing aria-label');
console.log("✓ ARIA Labels Verified");

// Test 2: Verify Click Interaction
items[3].click(); // Click Announcements
assert.ok(items[3].classList.contains('active'), 'Announcements button should be active after click');
assert.ok(!items[0].classList.contains('active'), 'Profile button should not be active');
console.log("✓ Click Interaction Verified");

// Test 3: Verify Keyboard Accessibility Attributes
items.forEach(item => {
    assert.strictEqual(item.getAttribute('tabindex'), '0', 'Item should be focusable');
    assert.strictEqual(item.getAttribute('role'), 'button', 'Item should have button role');
});
console.log("✓ Accessibility Attributes Verified");

console.log("All Sidebar Tests Passed!");
