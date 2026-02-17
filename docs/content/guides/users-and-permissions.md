# Users & Permissions

Vamsa is designed for families to use together. This guide explains how to invite family members, control what they can do, and manage login options.

## Roles

Every user in Vamsa has one of three roles. The role determines what they can see and do.

### Admin

Admins have full control over the entire application.

- Add, edit, and delete any person or relationship
- Upload and manage photos and media
- Manage users: invite new members, change roles, remove users
- Access application settings
- Create and restore backups
- Import and export data
- View audit logs

!!! note
    The first user account created during setup is automatically an Admin. Every Vamsa instance needs at least one Admin.

### Member

Members can contribute to the family tree but cannot change application settings or manage other users.

- Add new people and relationships
- Edit existing people and relationships
- Upload photos and media
- View the full family tree and all charts
- Export data

Members **cannot**:

- Manage other users or invitations
- Access application settings
- Create or restore backups
- Delete other users' contributions (depending on configuration)

### Viewer

Viewers have read-only access. They can look but not change anything.

- View all people, relationships, and charts
- Browse photos and media
- Export data (GEDCOM, calendar feeds)

Viewers **cannot**:

- Add, edit, or delete any data
- Upload media
- Access settings or user management

!!! tip "When to use each role"
    - **Admin**: The person running the Vamsa instance and anyone who helps maintain it
    - **Member**: Family members who actively contribute information, photos, and stories
    - **Viewer**: Extended family or younger family members who want to explore the tree without accidentally changing anything

## Inviting Family Members

Only Admins can invite new users.

1. Go to **Settings** in the main navigation.
2. Click **Users**.
3. Click **Invite User**.
4. Enter the person's **email address**.
5. Select a **role** (Admin, Member, or Viewer).
6. Click **Send Invitation**.

The invited person will receive an email with a link to create their account.

!!! info "What happens when someone accepts an invitation?"
    When they click the link in the email, they will be taken to a registration page where they create a password (or sign in with an OAuth provider like Google). Once registered, they can immediately access the tree with the permissions of their assigned role.

## Claiming a Profile

After signing in, a user can **claim** their person record in the family tree. This links their user account to a specific person in the tree.

1. After logging in, if an Admin has set up a profile claim for you, you will see a prompt to claim your profile.
2. Review the person record shown.
3. Click **Claim** to link your account to that person, or **Skip** if it is not you.

Once claimed, your user avatar and profile will be connected to your person record in the tree. This helps other family members see which tree entries correspond to active users.

!!! note
    Profile claiming is optional. If you choose to skip it, you can still use the app normally. An Admin can also set up or change profile claims from the user management page.

## Changing a User's Role

Admins can change any user's role at any time.

1. Go to **Settings > Users**.
2. Find the user you want to update.
3. Click on their entry to open their details.
4. Change the **Role** dropdown to the new role.
5. Click **Save**.

The change takes effect immediately. If you downgrade someone from Member to Viewer, they will no longer be able to edit the tree the next time they load a page.

## Removing a User

Admins can remove users from the system.

1. Go to **Settings > Users**.
2. Find the user you want to remove.
3. Click the **Delete** or **Remove** button.
4. Confirm the action in the dialog.

!!! warning
    Removing a user deletes their login account. It does **not** delete the person record they may have been linked to in the family tree. The person's data remains intact in the tree.

## Changing Your Password

If you signed up with an email and password (rather than OAuth):

1. Go to **Settings** or your **Profile** page.
2. Look for the **Change Password** option.
3. Enter your current password and your new password.
4. Click **Save**.

## Signing In with OAuth

Vamsa supports signing in with external identity providers, so you do not need to remember a separate password. The available options depend on how your Admin has configured the instance.

### Google

If Google sign-in is enabled, you will see a **Sign in with Google** button on the login page. Click it and follow the Google prompts to authorize access.

### Microsoft

If Microsoft sign-in is enabled, you will see a **Sign in with Microsoft** button. This works with personal Microsoft accounts, work accounts (Microsoft 365), and school accounts.

### GitHub

If GitHub sign-in is enabled, you will see a **Sign in with GitHub** button. This is most useful for technically-minded family members who already have GitHub accounts.

### Self-Hosted OIDC

!!! info "What is OIDC?"
    OIDC (OpenID Connect) is an industry standard for identity management. If your family runs a self-hosted identity server like Authentik or Keycloak, your Admin can configure Vamsa to use it for sign-in. This lets you use the same username and password you use for other self-hosted services.

If OIDC is configured, you will see a custom sign-in button on the login page (the label is set by the Admin).

## Next Steps

- [Managing People](managing-people.md) -- Start adding family members to the tree
- [Family Relationships](relationships.md) -- Connect people as parents, children, and spouses
- [Exporting Your Data](exporting-data.md) -- Learn about backups and data exports
