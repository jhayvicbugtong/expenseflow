// Copy the contact email to the clipboard.
// If the clipboard isn't available, select the text so the user can copy it manually.
(function () {
  var emailEl = document.getElementById('email');
  var button = document.getElementById('copyBtn');

  function showCopied() {
    button.textContent = 'Copied';
    setTimeout(function () {
      button.textContent = 'Copy';
    }, 1500);
  }

  function selectEmail() {
    var range = document.createRange();
    range.selectNodeContents(emailEl);

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    button.textContent = 'Selected';
  }

  button.addEventListener('click', function () {
    try {
      navigator.clipboard.writeText(emailEl.textContent).then(showCopied, selectEmail);
    } catch (e) {
      selectEmail();
    }
  });
})();
