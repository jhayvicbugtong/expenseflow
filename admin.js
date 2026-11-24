// Admin page: add or delete class outputs.
// In Supabase mode group members must log in first.
// In local mode (no Supabase yet) the dashboard opens directly.
(function () {
  var MAX_FILE_MB = 50;
  var ef = window.EFOutputs;
  var store = ef.store;

  function $(id) {
    return document.getElementById(id);
  }

  var views = ['login-form', 'view-denied', 'view-dashboard'];
  function show(viewId) {
    views.forEach(function (id) {
      $(id).hidden = id !== viewId;
    });
  }

  function setMessage(id, text, isError) {
    var node = $(id);
    node.textContent = text || '';
    node.classList.toggle('error', !!isError);
  }

  // ---------- Session (Supabase mode only) ----------

  async function refreshSession() {
    if (store.mode === 'local') {
      $('local-notice').hidden = false;
      $('signed-in').hidden = true;
      show('view-dashboard');
      loadList();
      return;
    }

    var client = store.client;
    var session = (await client.auth.getSession()).data.session;
    if (!session) {
      show('login-form');
      return;
    }

    var adminResult = await client.rpc('is_admin');
    if (adminResult.error || !adminResult.data) {
      $('denied-email').textContent = session.user.email;
      show('view-denied');
      return;
    }

    $('signed-in-as').textContent = session.user.email;
    show('view-dashboard');
    loadList();
  }

  $('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var form = this;
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage('login-msg', 'Signing in…');

    var result = await store.client.auth.signInWithPassword({
      email: $('login-email').value.trim(),
      password: $('login-password').value
    });

    button.disabled = false;
    if (result.error) {
      setMessage('login-msg', result.error.message, true);
      return;
    }
    setMessage('login-msg', '');
    form.reset();
    refreshSession();
  });

  document.querySelectorAll('[data-signout]').forEach(function (button) {
    button.addEventListener('click', async function () {
      await store.client.auth.signOut();
      show('login-form');
    });
  });

  // ---------- Add an output ----------

  $('add-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    var form = this;
    var button = form.querySelector('button[type="submit"]');
    var file = $('add-file').files[0] || null;

    if (file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setMessage('add-msg', 'That file is over ' + MAX_FILE_MB + ' MB. Please use a smaller file.', true);
      return;
    }

    button.disabled = true;
    setMessage('add-msg', file ? 'Saving file…' : 'Saving…');

    try {
      await store.add({
        title: $('add-title').value.trim(),
        activity_date: $('add-date').value || null,
        description: $('add-description').value.trim() || null,
        file: file
      });
      form.reset();
      setMessage('add-msg', 'Added! It now shows on the homepage.');
      loadList();
    } catch (error) {
      setMessage('add-msg', error.message, true);
    } finally {
      button.disabled = false;
    }
  });

  // ---------- List and delete ----------

  async function loadList() {
    var list = $('admin-list');
    setMessage('list-msg', 'Loading…');

    try {
      var items = await store.list();
      list.innerHTML = '';
      setMessage('list-msg', items.length ? '' : 'No outputs yet. Add your first one above.');

      items.forEach(function (item, i) {
        var card = ef.createCard(item, i + 1);
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn small danger';
        del.textContent = 'Delete';
        del.addEventListener('click', function () {
          deleteOutput(item, del);
        });
        card.appendChild(del);
        list.appendChild(card);
      });
    } catch (error) {
      setMessage('list-msg', 'Could not load outputs: ' + error.message, true);
    }
  }

  async function deleteOutput(item, button) {
    if (!confirm('Delete "' + item.title + '"? This cannot be undone.')) return;
    button.disabled = true;
    try {
      await store.remove(item);
      loadList();
    } catch (error) {
      button.disabled = false;
      alert('Could not delete: ' + error.message);
    }
  }

  refreshSession();
})();
