# Setting up Class Outputs

The **Class Outputs** section on the homepage loads its activities from a free
[Supabase](https://supabase.com) database. Group members add and delete outputs
on `admin.html`. You only need to do this setup **once**.

## Before setup: local mode

While `config.js` is empty, the site uses a **local database inside your browser** (IndexedDB).
Open `admin.html`, add outputs (no login needed), and they appear on the homepage.

- Outputs are saved **only in that browser on that computer**. Other people, phones, and
  other browsers won't see them, and clearing browsing data deletes them.
- Open `index.html` and `admin.html` the same way (both by double-clicking, or both through
  VS Code Live Server). Otherwise they count as different websites and won't share data.
- When you connect Supabase, the site switches to it automatically. Local outputs aren't
  copied over, so add them again in the online version.

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign up (free, no credit card), and click **New project**.
2. Give it a name (e.g. `expenseflow`), set a database password (save it somewhere), pick the
   region closest to you (e.g. *Southeast Asia (Singapore)*), and create it. Wait about a minute.

## 2. Create the table, file storage, and security rules

1. Open `supabase/setup.sql` in this folder.
2. At the bottom, **replace the three example emails** with your group members' real emails
   (lowercase). Add or remove lines as needed.
3. In Supabase, go to **SQL Editor → New query**, paste the whole file, and click **Run**.
   You should see "Success. No rows returned."

## 3. Create a login for each group member

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter the member's email (the same one you put in `setup.sql`) and a password.
   Tick **Auto Confirm User**, then create.
3. Repeat for each member.
4. Recommended: go to **Authentication → Sign In / Providers** and turn **off**
   "Allow new users to sign up". (Even without this, only emails in the list can make changes.)

## 4. Connect the website

1. In Supabase, go to **Project Settings → API Keys** (or **Data API**).
2. Copy the **Project URL** and the **anon / publishable key**.
3. Paste them into `config.js`:

   ```js
   window.EXPENSEFLOW_CONFIG = {
     supabaseUrl: 'https://your-project-id.supabase.co',
     supabaseKey: 'your-anon-or-publishable-key'
   };
   ```

   This key is meant to be public. **Never** paste the `service_role` / secret key here.

## 5. Add your first output

1. Open `admin.html` (or click **Group login** at the bottom of the homepage).
2. Log in with one of the accounts from step 3.
3. Fill in the title, date, description, choose a file, and click **Add output**.
4. Open the homepage: the new card appears in **Class Outputs**.

## Good to know

- **Order:** outputs are sorted by date (oldest first); outputs without a date come last, in the order they were added.
- **Files:** up to 50 MB each. PDFs and images open in the browser. Word/PowerPoint files
  download instead, so export them to PDF first if you want them viewable.
- **Adding a new member later:** run this in the SQL Editor, then create their login (step 3):

  ```sql
  insert into public.admins (email, name) values ('new.member@example.com', 'Full Name');
  ```

- **Who uploaded what:** each output card shows "Uploaded by …" using the name from the
  `admins` table. It's filled in automatically from whoever is logged in. Existing projects
  set up before this feature need to run `supabase/add-uploader.sql` once.

- **Free plan pause:** Supabase pauses free projects after about a week with no activity.
  If the outputs stop loading, log in to Supabase and click **Restore project**.
