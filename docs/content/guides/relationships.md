# Family Relationships

Relationships are the connections between people in your family tree. They are what turn a list of names into a living family history. This guide explains how to add, edit, and understand relationships in Vamsa.

## Types of Relationships

Vamsa supports four core relationship types:

| Type | What It Means | Example |
|------|---------------|---------|
| **Parent** | Person A is a parent of Person B | Rajesh is a parent of Priya |
| **Child** | Person A is a child of Person B | Priya is a child of Rajesh |
| **Spouse** | Person A is married to Person B | Rajesh is a spouse of Meena |
| **Sibling** | Person A is a brother or sister of Person B | Priya is a sibling of Amit |

!!! info "What about in-laws, step-parents, and other relationships?"
    Vamsa also tracks extended relationship types like parent-in-law, child-in-law, sibling-in-law, step-parent, step-child, and step-sibling. These are stored in the database and displayed where applicable, but the four core types above are the ones you will use most often.

## Adding a Relationship

1. Navigate to the person's profile page.
2. Click the **Relationships** tab.
3. Click **Add Relationship**.
4. Select the **relationship type** from the dropdown (Parent, Child, Spouse, or Sibling).
5. Search for and select the **related person** from the search field.
6. If you selected **Spouse**, you will see additional fields for marriage date and divorce date (both optional).
7. Click **Save**.

!!! tip "The relationship goes both ways"
    When you add a Parent relationship from Person A to Person B, Vamsa automatically creates the corresponding Child relationship from Person B to Person A. You do not need to add it twice.

### Spouse Relationship Details

When you create a Spouse relationship, you can record:

- **Marriage Date** -- When the marriage took place
- **Divorce Date** -- If applicable, when the marriage ended
- **Active** -- Whether the relationship is currently active

## How Vamsa Derives Relationships

Vamsa uses the relationships you enter to figure out connections you have not explicitly added. For example:

- If **Rajesh** is a parent of both **Priya** and **Amit**, then Vamsa knows that Priya and Amit are **siblings**.
- If **Rajesh** is a spouse of **Meena**, and Rajesh is a parent of **Priya**, then Meena is also shown as a parent of Priya (depending on how you set up the relationships).

!!! note
    Derived relationships appear on charts and visualizations automatically. However, for the most accurate tree, it is best to explicitly add the key relationships rather than relying solely on inference.

## Editing a Relationship

1. Go to the person's profile page.
2. Click the **Relationships** tab.
3. Find the relationship you want to change.
4. Click the **Edit** button next to it.
5. Update the type, related person, or dates as needed.
6. Click **Save**.

## Deleting a Relationship

1. Go to the person's profile page.
2. Click the **Relationships** tab.
3. Find the relationship you want to remove.
4. Click the **Delete** button.
5. Confirm the deletion in the dialog that appears.

!!! warning "Deleting a relationship removes the connection in both directions"
    If you delete the Parent relationship between Rajesh and Priya, the corresponding Child relationship from Priya to Rajesh is also removed. Neither person is deleted from the tree -- only the link between them is removed.

## Building Your Tree: A Recommended Approach

The most effective way to build a complete family tree is to work from the top down:

1. **Start with the oldest generation you know.** Add the earliest ancestors you have information about.
2. **Add their spouses.** Create Spouse relationships between married partners.
3. **Add their children.** Create Parent/Child relationships connecting parents to each child.
4. **Move to the next generation.** Repeat for each generation, working your way forward in time.
5. **Fill in siblings last.** In many cases, sibling relationships are automatically derived from shared parents.

!!! tip "One branch at a time"
    If your tree is large, focus on one branch of the family at a time. Complete one grandparent's line before moving to the next. This keeps the work manageable and reduces the chance of duplicate entries.

## Troubleshooting

**I cannot find the person I want to link to.**
Make sure the person has already been added to the tree. You need to create a person record before you can connect them to someone else. See [Managing People](managing-people.md) for how to add new people.

**The relationship seems backwards.**
Check whether you added the relationship from the right person. If you meant to say "A is a parent of B" but instead added "A is a child of B," edit or delete the relationship and re-create it in the correct direction.

**I see duplicate relationships.**
This can happen if the same relationship was added from both people's profiles. Delete the duplicate from either person's Relationships tab.

## Next Steps

- [Managing People](managing-people.md) -- Add and edit the people in your tree
- [Viewing Your Family Tree](family-tree.md) -- See your relationships displayed as visual charts
- [Importing Data](importing-data.md) -- Bring in existing family data from other tools
