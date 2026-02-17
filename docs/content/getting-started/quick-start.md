# Quick Start -- Your First 10 Minutes

You have Vamsa installed and running. This guide walks you through the basics: adding people, connecting them as family, viewing your tree, and inviting relatives to collaborate.

!!! info "Before you begin"
    Make sure Vamsa is running and you can access it in your browser. If not, go back to the [Installation](installation.md) guide first.

---

## 1. Log in

Open Vamsa in your browser:

- **Docker users**: [http://localhost](http://localhost)
- **Bare Metal users**: [http://localhost:3000](http://localhost:3000)
- **Cloud users**: Your deployed URL

You will see the login page. Enter the admin email and password you configured during installation.

!!! tip "Forgot your auto-generated password?"
    If you left `ADMIN_PASSWORD` empty during setup, Vamsa generated one for you. Find it in the logs:

    ```bash
    docker logs vamsa-app 2>&1 | grep -i password
    ```

**What you should see:** After signing in, you land on the Dashboard. It will be empty since you have not added anyone yet -- that is expected.

---

## 2. Add your first person

Start with yourself or a key ancestor -- someone who connects to many other people in your family.

1. Click the **"Add Person"** button on the Dashboard (or navigate to **People** in the sidebar and click **"Add Person"**)
2. Fill in the basic details:
    - **First Name** and **Last Name** (required)
    - **Date of Birth** (optional but helpful)
    - **Gender** (optional)
3. Click **"Save"**

**What you should see:** You are taken to that person's profile page. Their name appears at the top, along with any details you entered.

!!! tip "You can always edit later"
    Do not worry about filling in every field right now. You can come back and add photos, notes, birth places, and more at any time by clicking **"Edit"** on a person's profile.

---

## 3. Add a second person

A family tree needs at least two people to show a connection. Add a parent, child, spouse, or sibling of the person you just created.

1. Go to **People** in the sidebar
2. Click **"Add Person"** again
3. Fill in the details for your second family member
4. Click **"Save"**

**What you should see:** The People page now shows two entries.

---

## 4. Create a relationship

Now connect the two people you added.

1. Open the profile of either person (click their name in the People list)
2. Look for the **"Relationships"** section on their profile page
3. Click **"Add Relationship"**
4. Choose the relationship type:
    - **Parent/Child** -- "This person is the parent of..."
    - **Spouse/Partner** -- "This person is the spouse of..."
5. Search for and select the other person
6. Click **"Save"**

**What you should see:** The relationship now appears on both people's profiles. If you added a parent-child link, the child's profile shows the parent, and the parent's profile shows the child.

!!! info "Relationship types"
    Vamsa supports these relationship types:

    - **Parent / Child** -- biological, adoptive, or step
    - **Spouse / Partner** -- married, domestic partner, etc.

    You only need to add the relationship once -- Vamsa automatically creates the reverse link. If you say "Alice is the parent of Bob," then Bob's profile will show Alice as a parent.

---

## 5. View the family tree

This is where it gets fun.

1. Click **"Visualize"** in the sidebar (or click the tree icon)
2. You should see a graphical tree with your two people connected by a line

**What you should see:** A visual chart showing the people you added, connected by the relationship you created. Parents appear above children. Spouses appear side by side.

!!! tip "Navigation"
    - **Scroll** to zoom in and out
    - **Click and drag** to pan around the tree
    - **Click a person** to see their details in a sidebar panel
    - As you add more people and relationships, the tree grows automatically

---

## 6. Upload a photo

Adding photos makes your family tree come alive.

1. Go to a person's profile (click their name in the People list)
2. Click the **placeholder image** or the **"Edit"** button
3. In the edit form, look for the **photo upload** area
4. Click to browse or drag and drop a photo
5. Click **"Save"**

**What you should see:** The person's profile and their node in the family tree now show their photo.

!!! info "Supported formats"
    Vamsa accepts JPEG, PNG, and WebP images. Photos are stored locally on your server -- they never leave your network unless you configure cloud storage.

---

## 7. Invite a family member

Vamsa is more fun when your family helps fill in the details. You can invite relatives to view and contribute to the tree.

1. Click **"Settings"** in the sidebar (you need to be an admin)
2. Go to the **"Users"** tab
3. Click **"Invite User"**
4. Enter their email address
5. Choose their role:
    - **Viewer** -- can see the tree but not edit it
    - **Editor** -- can add and edit people, relationships, and photos
    - **Admin** -- full access including user management and settings
6. Click **"Send Invitation"**

**What you should see:** The invitation appears in the users list with a "Pending" status.

!!! info "Email configuration"
    If you have set up email (via the `RESEND_API_KEY` in your configuration), the invitation is sent automatically by email. If email is not configured, you will see a **shareable invitation link** that you can copy and send manually via text, WhatsApp, or any other method.

---

## 8. Export a backup

It is a good idea to create a backup right away, especially before making lots of changes.

1. Click **"Settings"** in the sidebar
2. Go to the **"Backup"** tab
3. Click **"Export Backup"**
4. A file will download to your computer

**What you should see:** A `.zip` file downloads containing your complete family tree data in GEDCOM format (the universal standard for genealogy data) plus any uploaded media.

!!! warning "Keep your backups safe"
    Store backup files somewhere other than the same machine running Vamsa. A USB drive, cloud storage (Google Drive, Dropbox), or a second computer are all good options.

!!! tip "Automated backups"
    If you used Docker, you can enable automated daily backups. See the [Installation guide](installation.md#optional-enable-automated-backups) for setup instructions, and the [Configuration guide](configuration.md#backups) for customizing the schedule.

---

## What is next?

You have covered the basics. Here are some things to explore:

- **[Managing People](../guides/managing-people.md)** -- Learn about all the details you can record (birth places, occupations, notes, and more)
- **[Family Relationships](../guides/relationships.md)** -- Understand relationship types and how to model complex family structures
- **[Viewing Your Family Tree](../guides/family-tree.md)** -- Explore the different visualization options
- **[Importing Data](../guides/importing-data.md)** -- Already have a GEDCOM file from Ancestry, FamilySearch, or another app? Import it
- **[Configuration](configuration.md)** -- Set up email, cloud backups, AI features, and more
