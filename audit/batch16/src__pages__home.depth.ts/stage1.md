# Stage 1 Outputs — home.depth.ts

## Agent 01
1. comment — block comment (lines 1–4)
2. import — named imports from ../auth.ts (line 5)
3. import — named imports from ../config.ts (line 6)
4. blank
5. bind name to function definition — _closeSheet (line 8)
6. blank
7. comment — // --- 1. AVATAR EMOJI PICKER --- (line 10)
8. bind name to value — AVATAR_EMOJIS (line 11)
9. top-level statement — document.getElementById('profile-avatar')!.addEventListener(...) (lines 12–48)
10. blank
11. comment — // --- 2. BIO INLINE EDIT --- (line 50)
12. bind name to value — bioDisplay (line 51)
13. bind name to value — bioEditPanel (line 52)
14. bind name to value — bioTextarea (line 53)
15. bind name to value — bioCharcount (line 54)
16. top-level statement — bioDisplay!.addEventListener('click', ...) (lines 55–62)
17. top-level statement — bioTextarea.addEventListener('input', ...) (lines 63–65)
18. top-level statement — document.getElementById('bio-cancel-btn')!.addEventListener(...) (lines 66–69)
19. top-level statement — document.getElementById('bio-save-btn')!.addEventListener(...) (lines 70–90)
20. blank
21. comment — // --- 3. FOLLOW LIST MODAL --- (line 92)
22. bind name to function definition — _openFollowList (lines 93–146)
23. top-level statement — document.getElementById('followers-stat')!.addEventListener(...) (line 147)
24. top-level statement — document.getElementById('following-stat')!.addEventListener(...) (line 148)

## Agent 02
1. comment — block comment (lines 1–4)
2. import — getCurrentUser, getCurrentProfile, updateProfile, getFollowers, getFollowing, showUserProfile from ../auth.ts
3. import — escapeHTML, showToast from ../config.ts
4. blank
5. bind name to function definition — _closeSheet
6. blank
7. comment — // --- 1. AVATAR EMOJI PICKER ---
8. bind name to value — AVATAR_EMOJIS
9. top-level statement — document.getElementById('profile-avatar')!.addEventListener('click', ...)
10. blank
11. comment — // --- 2. BIO INLINE EDIT ---
12. bind name to value — bioDisplay
13. bind name to value — bioEditPanel
14. bind name to value — bioTextarea
15. bind name to value — bioCharcount
16. top-level statement — bioDisplay!.addEventListener('click', ...)
17. top-level statement — bioTextarea.addEventListener('input', ...)
18. top-level statement — document.getElementById('bio-cancel-btn')!.addEventListener('click', ...)
19. top-level statement — document.getElementById('bio-save-btn')!.addEventListener('click', ...)
20. blank
21. comment — // --- 3. FOLLOW LIST MODAL ---
22. bind name to function definition — _openFollowList
23. top-level statement — document.getElementById('followers-stat')!.addEventListener('click', ...)
24. top-level statement — document.getElementById('following-stat')!.addEventListener('click', ...)

## Agent 03
(identical to Agent 02)

## Agent 04
(identical to Agent 02)

## Agent 05
1. comment — block comment (lines 1–4)
2. import — named imports from '../auth.ts' (line 5)
3. import — named imports from '../config.ts' (line 6)
4. blank (line 7)
5. bind name to function definition — _closeSheet (line 8)
6. blank (line 9)
7. comment — // --- 1. AVATAR EMOJI PICKER --- (line 10)
8. bind name to value — AVATAR_EMOJIS (line 11)
9. top-level statement — document.getElementById('profile-avatar')!.addEventListener(...) (lines 12–48)
10. blank (line 49)
11. comment — // --- 2. BIO INLINE EDIT --- (line 50)
12. bind name to value — bioDisplay (line 51)
13. bind name to value — bioEditPanel (line 52)
14. bind name to value — bioTextarea (line 53)
15. bind name to value — bioCharcount (line 54)
16. top-level statement — bioDisplay!.addEventListener('click', ...) (lines 55–62)
17. top-level statement — bioTextarea.addEventListener('input', ...) (lines 63–65)
18. top-level statement — document.getElementById('bio-cancel-btn')!.addEventListener(...) (lines 66–69)
19. top-level statement — document.getElementById('bio-save-btn')!.addEventListener(...) (lines 70–90)
20. blank (line 91)
21. comment — // --- 3. FOLLOW LIST MODAL --- (line 92)
22. bind name to function definition — _openFollowList (lines 93–146)
23. top-level statement — document.getElementById('followers-stat')!.addEventListener(...) (line 147)
24. top-level statement — document.getElementById('following-stat')!.addEventListener(...) (line 148)
