# Exporting Your Data

Your family data belongs to you. Vamsa will never lock you in. You can export everything at any time, in formats that work with other tools, other devices, and other people.

## Export Options at a Glance

| Format | What It Includes | Best For |
|--------|------------------|----------|
| **GEDCOM** (.ged) | People, relationships, dates, places, notes | Sharing with other genealogy software |
| **ZIP Backup** (.zip) | Everything: database export + uploaded photos and media | Full backup, moving to a new server |
| **Calendar Feed** (iCal) | Birth dates, death anniversaries, marriage dates | Subscribing in your calendar app |

---

## GEDCOM Export

GEDCOM is the universal format for genealogy data. Exporting as GEDCOM lets you open your family tree in virtually any other genealogy program.

### How to Export

1. Sign in to Vamsa as an **Admin** or **Member**.
2. Go to **Settings** in the main navigation.
3. Click **Export**.
4. Select **GEDCOM**.
5. Click **Download**.

A `.ged` file will download to your computer.

### What Is Included

- All people (names, dates, places, gender, notes, biographical information)
- All relationships (parent/child, spouse with marriage and divorce dates, siblings)
- Places and locations

### What Is Not Included

- Photos and media files (GEDCOM is a text-only format)
- User accounts and permissions
- Application settings

!!! info "Compatibility"
    Vamsa exports GEDCOM 5.5.1, which is supported by all major genealogy tools including Gramps, Ancestry, FamilySearch, MyHeritage, Legacy Family Tree, and RootsMagic.

---

## ZIP Backup

A ZIP backup is a complete snapshot of your Vamsa data -- the database export plus all uploaded photos and media files. This is the most thorough way to back up your tree.

### How to Export

1. Sign in to Vamsa as an **Admin**.
2. Go to **Settings** in the main navigation.
3. Click **Export**.
4. Select **Full Backup** (ZIP).
5. Click **Download**.

The download may take a moment if you have many photos. A `.zip` file will save to your computer.

### What Is Included

- Complete GEDCOM export (all people, relationships, dates, places, notes)
- All uploaded photos and media files
- Media metadata (which photo belongs to which person)

### When to Use ZIP Backup

- **Before major updates.** Always export a ZIP backup before upgrading Vamsa to a new version.
- **Regular offsite backups.** Save a ZIP backup to a USB drive, cloud storage, or another computer periodically.
- **Moving to a new server.** If you are migrating Vamsa to a different machine, a ZIP backup contains everything you need.
- **Disaster recovery.** If something goes wrong, you can restore from a ZIP backup.

!!! tip "How often should I back up?"
    A good rule of thumb: export a ZIP backup whenever you have made significant changes to your tree -- after a big data entry session, after importing new data, or at least once a month.

---

## Calendar Feed (iCal)

Vamsa can generate a calendar feed that you can subscribe to in your favorite calendar app. The feed includes important family dates so you never forget a birthday or anniversary.

!!! info "What is a calendar feed?"
    A calendar feed (also called iCal or ICS) is a web address (URL) that your calendar app checks regularly for events. When you subscribe, dates appear on your calendar automatically, and they stay up to date as you add or change data in Vamsa.

### What Dates Are Included

- **Birth dates** -- Annual reminders for birthdays of living family members
- **Death anniversaries** -- Annual remembrance dates
- **Marriage anniversaries** -- Wedding anniversary dates

### How to Set Up

1. Sign in to Vamsa.
2. Go to **Settings** in the main navigation.
3. Click **Calendar**.
4. Click **Copy Feed URL** to copy the calendar URL to your clipboard.
5. Open your calendar app and subscribe to the feed using the URL.

### Adding to Your Calendar App

#### Google Calendar

1. Open [Google Calendar](https://calendar.google.com) in a web browser.
2. On the left sidebar, find **Other calendars** and click the **+** button.
3. Select **From URL**.
4. Paste the feed URL you copied from Vamsa.
5. Click **Add Calendar**.

Family dates will appear within a few hours (Google Calendar refreshes subscribed calendars periodically).

#### Apple Calendar (macOS / iPhone / iPad)

1. Open the **Calendar** app.
2. Go to **File > New Calendar Subscription** (on Mac) or **Settings > Calendar > Accounts > Add Account > Other > Add Subscribed Calendar** (on iPhone/iPad).
3. Paste the feed URL.
4. Click **Subscribe**.

#### Microsoft Outlook

1. Open Outlook and go to your calendar.
2. Click **Add Calendar > From Internet** (or **Subscribe from web**).
3. Paste the feed URL.
4. Click **Import** or **OK**.

!!! tip "Calendar feeds update automatically"
    Once you subscribe, any new people or dates you add in Vamsa will automatically appear on your calendar the next time it refreshes (usually within 24 hours, depending on your calendar app).

---

## Sharing Data with Family

Here are some common scenarios for sharing your data:

**Family member uses a different genealogy program (Gramps, Ancestry, etc.):**
Export as GEDCOM and send them the `.ged` file. They can import it into their tool.

**Family member just wants to browse the tree:**
Invite them as a **Viewer** in Vamsa instead of exporting. See [Users & Permissions](users-and-permissions.md).

**Family member wants birthday reminders:**
Share the calendar feed URL with them. They can subscribe in their own calendar app without needing a Vamsa account.

**You are setting up Vamsa on a new server:**
Export a ZIP backup from the old instance and restore it on the new one.

---

## Next Steps

- [Importing Data](importing-data.md) -- Bring data into Vamsa from other tools
- [Users & Permissions](users-and-permissions.md) -- Invite family members to collaborate
- [Viewing Your Family Tree](family-tree.md) -- Explore your tree with interactive charts
