# Bharat Chat

MASTER BUILD PROMPT — BHARATCHAT



You are an expert full-stack Android application engineer.



Build a complete, functional Android messaging application named:



BHARATCHAT



START FROM ZERO.



Do not create a mockup, static prototype, UI-only demo, or collection of disconnected screens.



Build a complete working application with:

- Android frontend

- Backend/API layer where required

- Persistent database

- Authentication

- Authorization

- Messaging architecture

- Group architecture

- Staff/role system

- JARVIS privileged control system

- Notifications

- Permission handling

- Error handling

- Responsive mobile UI



The primary target is Android phones.



The application must be designed so that it can actually be built and installed as an Android APK.



==================================================

1. PRODUCT IDENTITY

==================================================



Application name:



BharatChat



Do NOT display:

- V1

- Version 1

- Prototype

- Demo

- Test Build



anywhere in the normal application branding.



The normal BharatChat interface should be modern, clean, friendly and familiar.



JARVIS should have a separate premium futuristic visual identity.



Do not copy WhatsApp's exact UI, branding, logo or proprietary assets.



==================================================

2. COMPLETE FIRST-LAUNCH FLOW

==================================================



When the application is installed and opened:



APP OPEN

↓

PERMISSION SETUP

↓

NORMAL LOGIN SCREEN



The application must not directly open the main dashboard before required permission setup is completed.



Only request permissions actually required by enabled features.



Current permissions:



1. Notifications

   Purpose: message notifications.



2. Microphone

   Purpose: voice messages.



3. Camera

   Purpose: camera functionality when enabled.



Use Android's official permission mechanism.



Never bypass Android permissions.



If a permission is mandatory for an enabled core feature and the user refuses it, prevent access to the affected application flow according to the app's permission policy.



==================================================

3. NORMAL AUTHENTICATION

==================================================



Create ONE normal BharatChat authentication screen.



Visual structure:



BharatChat



Username

[____________________]



Password

[____________________]



[ LOGIN ]



Create Account



small golden:



JARVIS



IMPORTANT:



Do NOT write:



Owner Login

Owner Username

Owner Password

Owner Account



The normal login screen must look like a normal messaging app login.



==================================================

4. USER REGISTRATION

==================================================



Create Account screen must require:



- Mobile Number

- Username

- Display Name

- Password



Mobile number is mandatory.



Username is mandatory and unique.



Display name is mandatory.



Password is mandatory.



OTP/SMS verification is NOT required in this version.



After successful registration, create a persistent user account.



Do not expose passwords.



==================================================

5. NORMAL USER LOGIN

==================================================



Normal users log in using:



Username + Password



After successful authentication:



OPEN NORMAL BHARATCHAT DASHBOARD.



==================================================

6. JARVIS ENTRY

==================================================



At the bottom of the normal authentication screen display:



JARVIS



It must be:



- Small

- Elegant

- Golden

- Clearly clickable

- Visually subtle



Clicking it opens:



JARVIS



JARVIS Username

[____________________]



JARVIS Password

[____________________]



[ LOGIN ]



IMPORTANT:



Do NOT display the word "Owner" on this screen.



The visible terms must only be:



JARVIS

JARVIS Username

JARVIS Password



JARVIS credentials must be configurable through private server-side configuration.



Use this details :



JARVIS_USERNAME = ASHUTOSH181481JARVIS



JARVIS_PASSWORD = JARVIS181481ASHUTOSH



GOD_KEY = 181481



Do not invent credentials.



Do not display configured credentials anywhere in the UI.



Do not put real credentials into source-code comments, demo screens, logs or API responses.



==================================================

7. JARVIS LOGIN RESULT

==================================================



THIS IS CRITICAL.



When JARVIS Username + JARVIS Password are correct:



DO NOT open a separate Owner Dashboard.



DO NOT open a separate Owner Control Center.



DO NOT open an Admin Dashboard.



DO NOT open a special futuristic dashboard.



Instead:



OPEN THE EXACT SAME NORMAL BHARATCHAT DASHBOARD.



The only difference is that the authenticated JARVIS account sees:



small golden JARVIS



at the TOP-RIGHT of the normal dashboard.



Normal users do not see this control.



==================================================

8. NORMAL BHARATCHAT DASHBOARD

==================================================



Create a complete mobile-first dashboard.



Top:



BharatChat



Notification icon



For JARVIS-authenticated account only:



small golden JARVIS at top-right.



Main content:



Search



Recent Chats



Groups



Bottom navigation:



Chats

Groups

Profile



Additional accessible features:



Notifications

Settings

Apply for a Staff Member



Normal users must not see privileged JARVIS controls.



==================================================

9. SECOND JARVIS AUTHENTICATION

==================================================



When the authenticated JARVIS account clicks the small golden JARVIS at the top-right:



OPEN:



JARVIS



Enter God Key



[ • • • • • • ]



[ CONTINUE ]



God Key must contain exactly 6 digits.



Every attempt to enter JARVIS OMNIVERS must require God Key verification.



Incorrect God Key:



- Do not open JARVIS OMNIVERS.

- Show an error.

- Remain on the verification screen.



Correct God Key:



OPEN JARVIS OMNIVERS.



==================================================

10. JARVIS OMNIVERS

==================================================



JARVIS OMNIVERS is the complete application command center.



This is the ONLY privileged command center.



Do NOT create separate screens named:



Owner Dashboard

Owner Control Center

Owner Panel

Owner Gateway

Administrative Gateway

JARVIS Engine

JARVIS Core

JARVIS Full Access Mode



The complete privileged functionality must exist inside:



JARVIS OMNIVERS



The interface should be:



- Futuristic

- Premium

- Cinematic

- Professional

- Mobile-friendly

- Easy to navigate



==================================================

11. JARVIS OMNIVERS MAIN SECTIONS

==================================================



Create command-center modules:



1. USERS

2. CHATS

3. GROUPS

4. STAFF

5. REPORTS

6. ANNOUNCEMENTS

7. SYSTEM



All privileged application controls belong here.



==================================================

12. USERS COMMAND CENTER

==================================================



JARVIS can view registered user information:



- Mobile Number

- Username

- Display Name

- Profile information

- Account creation information

- Group memberships

- Current role

- Account status

- Staff application information



JARVIS may:



- View user

- Suspend user

- Activate user

- Restrict user

- Review staff status

- Review reports

- View groups associated with user



Do NOT show the user's real password.



Do NOT create a recoverable plaintext password database.



Do not display passwords in logs or API responses.



==================================================

13. ONE-TO-ONE CHAT ADMINISTRATION

==================================================



Inside JARVIS OMNIVERS → CHATS:



Authorized JARVIS access can review user one-to-one conversations for platform administration, moderation, safety and support.



Show:



- Participants

- Messages

- Timestamps

- Conversation information



This capability must be disclosed clearly in the application's Privacy Policy/Terms.



Do not implement covert surveillance.



Do not attempt to access conversations outside the BharatChat platform.



==================================================

14. GROUP ADMINISTRATION

==================================================



JARVIS OMNIVERS → GROUPS



JARVIS can:



- View all groups

- Open groups

- View members

- Add members

- Remove members

- Promote group admins

- Remove group admins

- Change group permissions

- Change group settings

- Edit group information

- Delete groups



JARVIS does not need to be a normal member of a group to administer it.



==================================================

15. NORMAL GROUP SYSTEM

==================================================



Normal users can:



- Create groups

- Add members

- Send messages

- View members



Group admins can:



- Add members

- Remove members

- Promote group admins

- Remove group admins

- Edit group information

- Manage permissions

- Enable only-admins-can-send



Only group members can access normal group conversations.



==================================================

16. NORMAL ONE-TO-ONE CHAT

==================================================



Implement functional one-to-one messaging.



Features:



- Text messages

- Reply

- Forward

- Edit

- Delete

- Reactions

- Sent status

- Delivered status

- Read status

- Timestamp

- Online status

- Last seen

- Voice messages



Messages must persist in the database.



==================================================

17. VOICE MESSAGES

==================================================



Implement voice message recording and playback.



Use Android microphone permission.



Show voice messages as audio message bubbles.



Do NOT implement:



- Voice calling

- Video calling

- Group calling



==================================================

18. STAFF SYSTEM

==================================================



Every normal user dashboard must contain:



Apply for a Staff Member



Application screen:



Why do you want to become a staff member?



[TEXT AREA]



[APPLY]



Store applications persistently.



==================================================

19. STAFF HIERARCHY

==================================================



Roles:



OWNER

MANAGER

ADMIN

HELPER

VIEWER

NORMAL USER



Hierarchy:



OWNER

↓

MANAGER

↓

ADMIN

↓

HELPER

↓

VIEWER

↓

NORMAL USER



GROUP ADMIN is a separate group-level role.



Rules:



- Authorized Admin or higher can promote a normal user to Viewer.

- Authorized Admin or higher can promote Viewer to Helper.

- Authorized higher staff can promote Helper to Admin.

- Only JARVIS/Owner authority can promote Admin to Manager.

- Only JARVIS/Owner authority can change Manager status.



Do not allow users to promote themselves.



==================================================

20. STAFF DISPLAY

==================================================



Normal person's name remains unchanged.



Examples:



Rahul



Rahul (Viewer)



Rahul (Helper)



Rahul (Admin)



Rahul (Manager)



Use a visually distinct role label.



Do not reveal who originally appointed a staff member.



==================================================

21. STAFF MANAGEMENT

==================================================



JARVIS OMNIVERS → STAFF



Display:



- Pending applications

- Approved applications

- Rejected applications

- Current staff

- Roles



Controls:



- Approve

- Reject

- Promote

- Demote

- Remove staff role

- Change permitted staff actions



==================================================

22. ANNOUNCEMENTS

==================================================



JARVIS can create platform announcements.



Announcement sender identity:



👑 JARVIS 👑



JARVIS is a system identity, not a normal user profile.



Do not create a normal profile for JARVIS.



Do not reveal who configured JARVIS.



==================================================

23. REPORTS

==================================================



JARVIS OMNIVERS → REPORTS



Include:



- User reports

- Group reports

- Report status

- Moderation action



==================================================

24. SYSTEM

==================================================



JARVIS OMNIVERS → SYSTEM



Include:



- Application status

- Database status

- Feature status

- Maintenance state

- General application configuration



Do not implement unrestricted control of the user's phone, other devices, networks, or external systems.



JARVIS controls only the BharatChat application and its backend.



==================================================

25. NOTIFICATIONS

==================================================



Implement notifications for:



- New one-to-one messages

- Group messages

- Staff application updates

- Important account events

- JARVIS announcements



==================================================

26. BLOCK AND REPORT

==================================================



Users can:



- Block another user

- Report another user



Store report information for moderation.



==================================================

27. USER PROFILE

==================================================



Profile should show:



- Display Name

- Username

- Mobile Number

- Profile image if implemented

- Account information

- Groups/memberships

- Current staff role if applicable



Users can edit appropriate profile information.



==================================================

28. DATABASE

==================================================



Create a real persistent data model.



Entities/collections should include at minimum:



Users

Profiles

Sessions

Devices

Chats

ChatMembers

Messages

MessageRevisions

Groups

GroupMembers

GroupAdmins

GroupPermissions

StaffApplications

Roles

Permissions

Notifications

Reports

JARVISConfiguration



Use unique IDs and timestamps.



Create appropriate relationships.



==================================================

29. AUTHORIZATION

==================================================



Implement server-side authorization.



Normal users:



- Cannot access JARVIS authentication backend.

- Cannot access JARVIS OMNIVERS.

- Cannot call privileged JARVIS APIs directly.



Staff users only have the permissions assigned to their role.



JARVIS privileged operations must be validated server-side.



Do not rely only on frontend visibility.



==================================================

30. PASSWORD HANDLING

==================================================



Do NOT expose real passwords.



Do NOT:



- Show real passwords

- Log passwords

- Return passwords through API

- Display passwords in JARVIS

- Put passwords in visible configuration

- Create recoverable plaintext password storage



The application must support normal authentication without exposing password values.



==================================================

31. NO FAKE DATA

==================================================



Do not populate the production UI with fake people.



Do not display:



- Fake users

- Fake owner profiles

- Fake credentials

- Sample passwords

- Fake conversations

- Fake production statistics



If development seed data is required internally, isolate it from real application data and disable/remove it from the production UI.



==================================================

32. VISUAL DESIGN — BHARATCHAT

==================================================



Normal application:



- Clean

- Modern

- Premium

- Friendly

- Fast

- Familiar

- Mobile-first



Use:



- Elegant typography

- Proper spacing

- Rounded cards

- Smooth transitions

- Clear icons

- Good loading states

- Good empty states

- Good error states



==================================================

33. VISUAL DESIGN — JARVIS

==================================================



JARVIS OMNIVERS:



- Dark/futuristic visual direction

- Premium interface

- Cinematic feel

- High-tech panels

- Smooth animations

- Clear command modules

- Excellent mobile layout



Do not sacrifice usability for visual effects.



==================================================

34. FEATURES EXCLUDED FROM CURRENT VERSION

==================================================



Do NOT implement:



- OTP authentication

- Voice calls

- Video calls

- Group calls

- Status/Stories

- Advanced file-sharing platform

- Advanced search

- Activity Ledger

- Single-device JARVIS session restriction

- Unrestricted phone control

- Unrestricted network/device access

- Hidden surveillance outside disclosed platform administration



These may be added later.



==================================================

35. PRIVACY AND ADMINISTRATION NOTICE

==================================================



Because authorized JARVIS administration can review platform communications and user information, include an appropriate Privacy Policy / Terms section explaining:



- What account information is collected.

- That authorized platform administrators may access account data.

- That authorized administrators may review communications for moderation, safety, support and platform administration.

- That users should not assume platform communications are private from authorized platform administrators.



Do not hide this capability from users.



==================================================

36. JARVIS AUTHENTICATION CONFIGURATION

==================================================



Create one private configuration area:



JARVIS_USERNAME = [FILL_HERE]

JARVIS_PASSWORD = [FILL_HERE]

GOD_KEY = [FILL_6_DIGITS_HERE]



Do not display these values anywhere.



Do not invent values.



Make the configuration easy to change later.



==================================================

37. FINAL NAVIGATION

==================================================



The application must follow EXACTLY this flow:



INSTALL

↓

OPEN

↓

PERMISSION SETUP

↓

NORMAL LOGIN



NORMAL LOGIN

│

├── USERNAME + PASSWORD

│       ↓

│   NORMAL BHARATCHAT DASHBOARD

│

└── GOLDEN JARVIS

        ↓

   JARVIS USERNAME

   JARVIS PASSWORD

        ↓

   NORMAL BHARATCHAT DASHBOARD

        ↓

   SMALL GOLDEN JARVIS TOP-RIGHT

        ↓

      GOD KEY

        ↓

   JARVIS OMNIVERS

        ↓

COMPLETE BHARATCHAT COMMAND CENTER



This navigation is mandatory.



==================================================

38. VISIBLE NAMING

==================================================



Use:



BharatChat

JARVIS

JARVIS Username

JARVIS Password

God Key

JARVIS OMNIVERS



Do NOT use:



Owner Login

Owner Dashboard

Owner Control Center

Owner Panel

Owner Username

Owner Password

Owner Gateway

Administrative Gateway

JARVIS Core

JARVIS Engine

JARVIS Full Access Mode



The user should experience JARVIS as one unified system.



==================================================

39. ANDROID REQUIREMENTS

==================================================



Target modern Android phones.



Support:



- Responsive phone layouts

- Android back navigation

- Loading states

- Offline/error states

- Permission states

- Network error states

- Authentication errors

- Empty states



Ensure the project can generate a debug APK.



==================================================

40. BUILD AND SELF-TEST

==================================================



After implementation:



1. Install dependencies.

2. Build the complete application.

3. Fix compilation errors.

4. Fix navigation errors.

5. Fix runtime crashes.

6. Test authentication.

7. Test database persistence.

8. Test normal chat.

9. Test groups.

10. Test staff application.

11. Test JARVIS authentication.

12. Test normal dashboard after JARVIS login.

13. Test golden JARVIS top-right control.

14. Test God Key.

15. Test JARVIS OMNIVERS.

16. Test Users.

17. Test Chats.

18. Test Groups.

19. Test Staff.

20. Test Reports.

21. Test Announcements.

22. Test System.

23. Test role authorization.

24. Verify fake data is absent.

25. Verify passwords are never exposed.

26. Verify normal users cannot access JARVIS OMNIVERS.

27. Run a final production-style build.



Do not stop after creating UI screens.



The application must be functionally connected.



==================================================

41. FINAL SUCCESS CRITERIA

==================================================



The project is considered complete only when:



- BharatChat launches.

- Permission setup works.

- Registration works.

- Normal login works.

- Normal dashboard works.

- One-to-one chat works.

- Groups work.

- Staff application works.

- JARVIS entry works.

- JARVIS username/password authentication works.

- JARVIS authentication opens the NORMAL dashboard.

- Golden JARVIS appears only for authenticated JARVIS.

- God Key screen works.

- Correct God Key opens JARVIS OMNIVERS.

- JARVIS OMNIVERS contains the complete application command center.

- User management works.

- Chat administration works.

- Group administration works.

- Staff management works.

- Reports work.

- Announcements work.

- System section works.

- Server-side authorization works.

- No real passwords are exposed.

- No fake users are shown.

- No unnecessary Owner terminology exists in the UI.

- The app builds successfully.

- The application is ready to generate/install as an Android APK.



IMPORTANT FINAL INSTRUCTION:



Do not merely explain how to build this application.



ACTUALLY BUILD THE COMPLETE APPLICATION.



If you encounter a build error, diagnose it and fix it.



If you encounter a runtime error, diagnose it and fix it.



If a dependency is missing, configure it.



If navigation is broken, fix it.



If a screen is incomplete, implement it.



Continue until the complete BharatChat application described above is implemented and the project builds successfully.



Do not stop after generating a plan.

Do not stop after generating mockups.

Do not stop after creating only frontend screens.



BUILD THE COMPLETE BHARATCHAT APPLICATION.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bharat-chat-nexus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/93f964de-f9d5-4002-9fa2-16e7045d1afc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
