# Importing Existing Data

If you already have family data in another genealogy tool, you do not need to start from scratch. Vamsa can import GEDCOM files, the universal standard for genealogy data exchange.

!!! info "What is GEDCOM?"
    GEDCOM (Genealogical Data Communication) is a file format created by the Church of Jesus Christ of Latter-day Saints. It has been the standard way to share family tree data between software programs since the 1980s. Nearly every genealogy application can export and import GEDCOM files. The files have a `.ged` extension.

## Exporting from Other Tools

Before you can import into Vamsa, you need to export your data from your current tool. Here is how to do it in the most popular programs.

### Gramps

1. Open your family tree in Gramps.
2. Go to **Family Trees > Export**.
3. Select **GEDCOM** as the format.
4. Choose a location to save the file.
5. Click **Export**.

### FamilySearch

1. Sign in to [FamilySearch.org](https://www.familysearch.org).
2. Navigate to your family tree.
3. Look for the **Download GEDCOM** option in the tree settings or menu.
4. Save the `.ged` file to your computer.

### Ancestry

1. Sign in to [Ancestry.com](https://www.ancestry.com).
2. Go to your tree.
3. Click **Tree Settings** (the gear icon).
4. Look for **Export Tree** and select **GEDCOM**.
5. Ancestry will prepare the file. Download it when ready.

### MyHeritage

1. Sign in to [MyHeritage.com](https://www.myheritage.com).
2. Go to **Family Tree > Manage Trees**.
3. Click **Export to GEDCOM** for the tree you want.
4. Download the file.

!!! tip "Other tools"
    If your software is not listed here, look for an "Export" or "Save As" option and choose GEDCOM format. Almost every genealogy program supports it.

## Importing into Vamsa

Once you have a `.ged` file, follow these steps:

1. Sign in to Vamsa as an **Admin**.
2. Go to **Settings** in the main navigation.
3. Click **Import**.
4. Click **Select File** and choose your `.ged` file.
5. Vamsa will process the file and show you a summary of what will be imported.
6. Review the summary, then click **Import** to confirm.

The import may take a few seconds to a few minutes depending on the size of your family tree.

## What Gets Imported

GEDCOM import brings in the following data:

- **People** -- Names, birth dates, death dates, gender
- **Relationships** -- Parent/child connections, marriages (with dates), sibling links
- **Dates** -- Birth, death, marriage, and divorce dates
- **Places** -- Birth places, death places, marriage locations
- **Notes** -- Biographical notes and other free-text fields attached to people

## What Does Not Get Imported

There are some things that GEDCOM files typically do not include:

- **Photos and media files** -- GEDCOM is a text-based format and does not embed images. You will need to upload photos manually after importing.
- **User accounts** -- GEDCOM contains people data, not login information. You will need to invite family members separately.
- **Application-specific features** -- Custom fields or features unique to your previous software may not transfer.

!!! note
    Some GEDCOM files include references to media file paths (like `C:\Photos\grandma.jpg`), but the actual image files are not inside the GEDCOM. Vamsa records these references but cannot display the images unless you upload them separately.

## Handling Import Conflicts

If you import data into a Vamsa instance that already has people in it, the import will add new records alongside the existing ones. Vamsa does not automatically merge duplicates.

After importing, you should review your tree for:

- **Duplicate people** -- The same person may appear twice if they existed in both the import and your current tree
- **Missing relationships** -- Some connections may not have mapped correctly between the tools

!!! tip "Resolving duplicates"
    If you find duplicate entries, decide which record has the more complete data. Edit the better record to include any missing details from the duplicate, then delete the duplicate. Make sure to reassign any relationships from the duplicate to the kept record first.

## Validating Your Import

After the import completes, take a few minutes to verify that everything came through correctly:

1. **Check the People list.** Go to the People page and confirm the total count looks right.
2. **Spot-check a few individuals.** Open several person profiles and verify their names, dates, and places.
3. **View the Tree Chart.** Go to **Visualize > Tree** and look for any disconnected branches or missing connections.
4. **Check the Statistics page.** The Statistics dashboard shows totals and distributions that can help you quickly spot problems (for example, an unusually low number of relationships).

## Tips for a Smooth Import

!!! tip "Test with a fresh instance first"
    If possible, do a trial import into a fresh Vamsa instance (or a test environment) before importing into your main tree. This lets you verify the data looks correct without any risk to your existing records.

!!! tip "Clean up your source data first"
    Before exporting from your old tool, take a few minutes to fix any obvious errors -- misspelled names, incorrect dates, or duplicate entries. It is much easier to clean data in the tool you are already familiar with.

!!! tip "Import once, then build from there"
    GEDCOM import is best used as a one-time migration step. After importing, make all future changes directly in Vamsa. Running multiple imports can create duplicates.

## Next Steps

- [Managing People](managing-people.md) -- Edit and refine the imported data
- [Family Relationships](relationships.md) -- Review and fix relationship connections
- [Viewing Your Family Tree](family-tree.md) -- Explore your imported tree visually
- [Exporting Your Data](exporting-data.md) -- Learn how to export data back out of Vamsa
