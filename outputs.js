// Class Outputs: data storage + card rendering (used by index.html and admin.html).
//
// Two storage modes with the same interface (list / add / remove):
//   - "supabase": online database, used when config.js has a URL and key.
//   - "local":    IndexedDB inside this browser, used until Supabase is set up.
//                 Data stays on this computer/browser only.
(function () {
  var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  var cfg = window.EXPENSEFLOW_CONFIG || {};
  var useSupabase = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);

  // ---------- Helpers ----------

  function fileExtension(name) {
    var match = /\.([a-z0-9]+)$/i.exec(name || '');
    return match ? match[1].toLowerCase() : '';
  }

  // "2026-10-15" → "October 15, 2026"
  function formatDate(value) {
    if (!value) return '';
    var parts = value.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Oldest date first, undated items last, then by when they were added.
  function sortOutputs(items) {
    return items.sort(function (a, b) {
      if (a.activity_date !== b.activity_date) {
        if (!a.activity_date) return 1;
        if (!b.activity_date) return -1;
        return a.activity_date < b.activity_date ? -1 : 1;
      }
      return String(a.created_at).localeCompare(String(b.created_at));
    });
  }

  function newId() {
    return window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ---------- Supabase storage ----------

  function createSupabaseStore() {
    var BUCKET = 'outputs';
    var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);

    function publicUrl(path) {
      return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    return {
      mode: 'supabase',
      client: client,

      list: async function () {
        var result = await client.from('outputs').select('*');
        if (result.error) throw result.error;
        return sortOutputs(result.data.map(function (row) {
          return Object.assign({}, row, { url: row.file_path ? publicUrl(row.file_path) : null });
        }));
      },

      add: async function (input) {
        var filePath = null;
        if (input.file) {
          filePath = Date.now() + '-' + input.file.name.toLowerCase().replace(/[^a-z0-9.\-]+/g, '-');
          var upload = await client.storage.from(BUCKET).upload(filePath, input.file);
          if (upload.error) throw new Error('Upload failed: ' + upload.error.message);
        }

        var insert = await client.from('outputs').insert({
          title: input.title,
          activity_date: input.activity_date,
          description: input.description,
          file_path: filePath,
          file_name: input.file ? input.file.name : null
        });
        if (insert.error) {
          // Don't leave an orphaned file behind if saving the details failed.
          if (filePath) await client.storage.from(BUCKET).remove([filePath]);
          throw new Error('Could not save: ' + insert.error.message);
        }
      },

      remove: async function (item) {
        var result = await client.from('outputs').delete().eq('id', item.id);
        if (result.error) throw result.error;
        if (item.file_path) await client.storage.from(BUCKET).remove([item.file_path]);
      }
    };
  }

  // ---------- Local storage (IndexedDB) ----------

  function createLocalStore() {
    var DB_NAME = 'expenseflow-local';
    var STORE = 'outputs';
    var objectUrls = [];
    var dbPromise = null;

    function openDb() {
      if (!dbPromise) {
        dbPromise = new Promise(function (resolve, reject) {
          var request = indexedDB.open(DB_NAME, 1);
          request.onupgradeneeded = function () {
            request.result.createObjectStore(STORE, { keyPath: 'id' });
          };
          request.onsuccess = function () { resolve(request.result); };
          request.onerror = function () { reject(request.error); };
        });
      }
      return dbPromise;
    }

    // Runs one operation in a transaction and resolves with its result when committed.
    async function run(mode, operation) {
      var db = await openDb();
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var request = operation(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(request.result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('Storage is full or blocked.')); };
      });
    }

    return {
      mode: 'local',

      list: async function () {
        var records = await run('readonly', function (store) { return store.getAll(); });

        // Free the previous batch of file links before making new ones.
        objectUrls.forEach(URL.revokeObjectURL);
        objectUrls = [];

        return sortOutputs(records.map(function (record) {
          var url = null;
          if (record.file) {
            url = URL.createObjectURL(record.file);
            objectUrls.push(url);
          }
          return Object.assign({}, record, { url: url });
        }));
      },

      add: async function (input) {
        await run('readwrite', function (store) {
          return store.put({
            id: newId(),
            title: input.title,
            activity_date: input.activity_date,
            description: input.description,
            file: input.file || null,
            file_name: input.file ? input.file.name : null,
            created_at: new Date().toISOString()
          });
        });
      },

      remove: async function (item) {
        await run('readwrite', function (store) { return store.delete(item.id); });
      }
    };
  }

  // ---------- Card rendering ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // Builds one output card. Uses textContent everywhere so entered text can't inject HTML.
  function createCard(item, number) {
    var card = el('article', 'output');
    card.style.animationDelay = Math.min(number - 1, 8) * 70 + 'ms';   // cards appear one after another
    var ext = fileExtension(item.file_name);
    var viewable = ext === 'pdf' || IMAGE_EXT.indexOf(ext) !== -1;

    if (item.url && IMAGE_EXT.indexOf(ext) !== -1) {
      var thumbLink = el('a', 'output-thumb');
      thumbLink.href = item.url;
      thumbLink.target = '_blank';
      thumbLink.rel = 'noopener';
      var img = el('img');
      img.src = item.url;
      img.alt = item.title;
      img.loading = 'lazy';
      thumbLink.appendChild(img);
      card.appendChild(thumbLink);
    }

    var meta = 'Activity ' + number;
    if (item.activity_date) meta += ' · ' + formatDate(item.activity_date);
    card.appendChild(el('div', 'output-meta', meta));
    card.appendChild(el('h3', null, item.title));
    if (item.description) card.appendChild(el('p', null, item.description));

    if (item.url) {
      var link = el('a', 'btn small outline', ext ? 'View ' + ext.toUpperCase() : 'View file');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener';
      // PDFs and images open in a new tab; other files download with their real name.
      if (!viewable && item.file_name) link.download = item.file_name;
      card.appendChild(link);
    }
    return card;
  }

  // Local mode is only for testing on your own computer. On the live website a
  // missing Supabase connection is an error (store = null), never an open dashboard.
  var isLocalTest = location.protocol === 'file:' ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var store = useSupabase ? createSupabaseStore() : (isLocalTest ? createLocalStore() : null);

  window.EFOutputs = {
    store: store,
    createCard: createCard
  };

  // ---------- Public list on the homepage ----------

  var list = document.getElementById('outputs-list');
  if (!list) return;

  // Works on older phones that lack element.replaceChildren().
  function setChildren(parent, nodes) {
    while (parent.firstChild) parent.removeChild(parent.firstChild);
    nodes.forEach(function (node) { parent.appendChild(node); });
  }

  function showMessage(text) {
    setChildren(list, [el('p', 'outputs-empty', text)]);
  }

  if (!store) {
    showMessage('Could not load class outputs right now. Please try again later.');
    return;
  }

  if (store.mode === 'local') {
    var note = el('p', 'outputs-note', 'Local preview: these outputs are saved only in this browser.');
    list.parentNode.insertBefore(note, list);
  }

  store.list()
    .then(function (items) {
      if (!items.length) {
        showMessage('No outputs yet. Group members can add them from the Group login page.');
        return;
      }
      setChildren(list, items.map(function (item, i) {
        return createCard(item, i + 1);
      }));
    })
    .catch(function (error) {
      console.error(error);
      showMessage('Could not load class outputs right now. Please try again later.');
    });
})();
