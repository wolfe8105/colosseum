# Stage 1 Outputs — auth.types.ts

## Agent 01

1. JSDoc comment: module header "THE MODERATOR — Auth Type Definitions"
2. JSDoc comment: "Pure types — no runtime code, no imports needed."
3. JSDoc comment: "All auth sub-modules import from here."
4. import type: `User` from `@supabase/supabase-js`
5. import type: `Session` from `@supabase/supabase-js`
6. JSDoc comment: "Supabase RPC result shape — matches what supabase.rpc() actually returns"
7. interface declaration: `SafeRpcResult<T>`
8. generic type parameter: `T` with default `unknown` on `SafeRpcResult`
9. interface field: `data: T | null`
10. interface field: `error: { message: string; code?: string; status?: number } | null`
11. inline object type: `{ message: string; code?: string; status?: number }` as type of `error`
12. inline object field: `message: string` inside `error` object type
13. inline object field: `code?: string` inside `error` object type (optional)
14. inline object field: `status?: number` inside `error` object type (optional)
15. JSDoc comment: "Auth operation result — success or failure with error message"
16. interface declaration: `AuthResult<T>`
17. generic type parameter: `T` with default `Record<string, unknown>` on `AuthResult`
18. interface field: `success: boolean`
19. interface field: `placeholder?: boolean` (optional)
20. interface field: `error?: string` (optional)
21. interface field: `user?: User` (optional)
22. interface field: `session?: Session | null` (optional)
23. interface field: `url?: string` (optional)
24. interface field: `data?: T` (optional)
25. interface field: `count?: number` (optional)
26. JSDoc comment: "Profile row from the profiles table"
27. interface declaration: `Profile`
28. interface field: `id: string`
29. interface field: `display_name: string | null`
30. interface field: `username: string | null`
31. interface field: `avatar_url: string | null`
32. interface field: `bio: string | null`
33. interface field: `elo_rating: number`
34. interface field: `token_balance: number`
35. interface field: `level: number`
36. interface field: `xp: number`
37. interface field: `streak_freezes: number`
38. interface field: `questions_answered: number`
39. interface field: `wins: number`
40. interface field: `losses: number`
41. interface field: `draws: number`
42. interface field: `current_streak: number`
43. interface field: `debates_completed: number`
44. interface field: `subscription_tier: string`
45. interface field: `profile_depth_pct: number`
46. interface field: `trust_score: number`
47. interface field: `is_minor: boolean`
48. interface field: `is_moderator: boolean`
49. interface field: `mod_available: boolean`
50. interface field: `mod_rating: number`
51. interface field: `mod_debates_total: number`
52. interface field: `mod_rulings_total: number`
53. interface field: `mod_approval_pct: number`
54. interface field: `created_at: string`
55. interface field: `updated_at?: string` (optional)
56. JSDoc comment: "Profile may have additional columns not listed here"
57. index signature: `[key: string]: unknown` on `Profile`
58. JSDoc comment: "Public profile returned by get_public_profile RPC"
59. interface declaration: `PublicProfile`
60. interface field: `id: string`
61. interface field: `username: string | null`
62. interface field: `display_name: string | null`
63. interface field: `avatar_url: string | null`
64. interface field: `bio: string | null`
65. interface field: `elo_rating: number`
66. interface field: `wins: number`
67. interface field: `losses: number`
68. interface field: `current_streak: number`
69. interface field: `level: number`
70. interface field: `debates_completed: number`
71. interface field: `followers: number`
72. interface field: `following: number`
73. interface field: `is_following: boolean`
74. interface field: `subscription_tier: string`
75. interface field: `created_at: string`
76. interface field: `is_private?: boolean` (optional)
77. interface field: `verified_gladiator?: boolean` (optional)
78. interface field: `intro_music_id?: string` (optional)
79. interface field: `custom_intro_url?: string | null` (optional)
80. interface field: `error?: string` (optional)
81. JSDoc comment: "Follow data row with joined profile"
82. interface declaration: `FollowRow`
83. interface field: `follower_id?: string` (optional)
84. interface field: `following_id?: string` (optional)
85. interface field: `profiles?: Array<{ username: string | null; display_name: string | null; elo_rating: number }>` (optional)
86. inline array type as type of `profiles`
87. inline object type as array element type
88. inline object field: `username: string | null`
89. inline object field: `display_name: string | null`
90. inline object field: `elo_rating: number`
91. JSDoc comment: "Moderator data for available moderators list"
92. interface declaration: `ModeratorInfo`
93. interface field: `id: string`
94. interface field: `display_name: string | null`
95. interface field: `mod_rating: number`
96. interface field: `mod_debates_total: number`
97. interface field: `mod_approval_pct: number`
98. JSDoc comment: "Reference/evidence row"
99. interface declaration: `DebateReference`
100. interface field: `id: string`
101. interface field: `debate_id: string`
102. interface field: `content: string | null`
103. interface field: `reference_type: string | null`
104. interface field: `supports_side: string | null`
105. interface field: `ruling: string | null`
106. index signature: `[key: string]: unknown` on `DebateReference`
107. JSDoc comment: "Rival data"
108. interface declaration: `RivalData`
109. interface field: `id: string`
110. interface field: `target_id: string`
111. interface field: `message: string | null`
112. interface field: `status: string`
113. index signature: `[key: string]: unknown` on `RivalData`
114. JSDoc comment: "Profile update fields — only safe client-writable fields"
115. interface declaration: `ProfileUpdate`
116. interface field: `display_name?: string | null` (optional)
117. interface field: `avatar_url?: string | null` (optional)
118. interface field: `bio?: string | null` (optional)
119. interface field: `username?: string | null` (optional)
120. interface field: `preferred_language?: string | null` (optional)
121. interface field: `is_private?: boolean | null` (optional)
122. JSDoc comment: "Auth state change listener"
123. type alias declaration: `AuthListener`
124. function type: `(user: User | null, profile: Profile | null) => void`
125. function parameter: `user: User | null`
126. function parameter: `profile: Profile | null`
127. return type: `void`
128. JSDoc comment: "Sign-up parameters"
129. interface declaration: `SignUpParams`
130. interface field: `email: string`
131. interface field: `password: string`
132. interface field: `username: string`
133. interface field: `displayName: string`
134. interface field: `dob: string`
135. JSDoc comment: "Log-in parameters"
136. interface declaration: `LogInParams`
137. interface field: `email: string`
138. interface field: `password: string`

## Agent 02

1. JSDoc comment: module header "THE MODERATOR — Auth Type Definitions"
2. JSDoc comment: "Pure types — no runtime code, no imports needed."
3. JSDoc comment: "All auth sub-modules import from here."
4. import type: `User` from `@supabase/supabase-js`
5. import type: `Session` from `@supabase/supabase-js`
6. JSDoc comment: "Supabase RPC result shape — matches what supabase.rpc() actually returns"
7. interface declaration: `SafeRpcResult<T = unknown>`
8. generic type parameter: `T` with default `unknown` on `SafeRpcResult`
9. interface field: `data: T | null`
10. interface field: `error: { message: string; code?: string; status?: number } | null`
11. inline object type field: `message: string`
12. inline object type field: `code?: string` (optional)
13. inline object type field: `status?: number` (optional)
14. JSDoc comment: "Auth operation result — success or failure with error message"
15. interface declaration: `AuthResult<T = Record<string, unknown>>`
16. generic type parameter: `T` with default `Record<string, unknown>` on `AuthResult`
17. interface field: `success: boolean`
18. interface field: `placeholder?: boolean` (optional)
19. interface field: `error?: string` (optional)
20. interface field: `user?: User` (optional)
21. interface field: `session?: Session | null` (optional)
22. interface field: `url?: string` (optional)
23. interface field: `data?: T` (optional)
24. interface field: `count?: number` (optional)
25. JSDoc comment: "Profile row from the profiles table"
26. interface declaration: `Profile`
27. interface field: `id: string`
28. interface field: `display_name: string | null`
29. interface field: `username: string | null`
30. interface field: `avatar_url: string | null`
31. interface field: `bio: string | null`
32. interface field: `elo_rating: number`
33. interface field: `token_balance: number`
34. interface field: `level: number`
35. interface field: `xp: number`
36. interface field: `streak_freezes: number`
37. interface field: `questions_answered: number`
38. interface field: `wins: number`
39. interface field: `losses: number`
40. interface field: `draws: number`
41. interface field: `current_streak: number`
42. interface field: `debates_completed: number`
43. interface field: `subscription_tier: string`
44. interface field: `profile_depth_pct: number`
45. interface field: `trust_score: number`
46. interface field: `is_minor: boolean`
47. interface field: `is_moderator: boolean`
48. interface field: `mod_available: boolean`
49. interface field: `mod_rating: number`
50. interface field: `mod_debates_total: number`
51. interface field: `mod_rulings_total: number`
52. interface field: `mod_approval_pct: number`
53. interface field: `created_at: string`
54. interface field: `updated_at?: string` (optional)
55. index signature: `[key: string]: unknown` on `Profile`
56. JSDoc comment: "Public profile returned by get_public_profile RPC"
57. interface declaration: `PublicProfile`
58. interface field: `id: string`
59. interface field: `username: string | null`
60. interface field: `display_name: string | null`
61. interface field: `avatar_url: string | null`
62. interface field: `bio: string | null`
63. interface field: `elo_rating: number`
64. interface field: `wins: number`
65. interface field: `losses: number`
66. interface field: `current_streak: number`
67. interface field: `level: number`
68. interface field: `debates_completed: number`
69. interface field: `followers: number`
70. interface field: `following: number`
71. interface field: `is_following: boolean`
72. interface field: `subscription_tier: string`
73. interface field: `created_at: string`
74. interface field: `is_private?: boolean` (optional)
75. interface field: `verified_gladiator?: boolean` (optional)
76. interface field: `intro_music_id?: string` (optional)
77. interface field: `custom_intro_url?: string | null` (optional)
78. interface field: `error?: string` (optional)
79. JSDoc comment: "Follow data row with joined profile"
80. interface declaration: `FollowRow`
81. interface field: `follower_id?: string` (optional)
82. interface field: `following_id?: string` (optional)
83. interface field: `profiles?: Array<{ username: string | null; display_name: string | null; elo_rating: number }>` (optional)
84. inline array element object type field: `username: string | null`
85. inline array element object type field: `display_name: string | null`
86. inline array element object type field: `elo_rating: number`
87. JSDoc comment: "Moderator data for available moderators list"
88. interface declaration: `ModeratorInfo`
89. interface field: `id: string`
90. interface field: `display_name: string | null`
91. interface field: `mod_rating: number`
92. interface field: `mod_debates_total: number`
93. interface field: `mod_approval_pct: number`
94. JSDoc comment: "Reference/evidence row"
95. interface declaration: `DebateReference`
96. interface field: `id: string`
97. interface field: `debate_id: string`
98. interface field: `content: string | null`
99. interface field: `reference_type: string | null`
100. interface field: `supports_side: string | null`
101. interface field: `ruling: string | null`
102. index signature: `[key: string]: unknown` on `DebateReference`
103. JSDoc comment: "Rival data"
104. interface declaration: `RivalData`
105. interface field: `id: string`
106. interface field: `target_id: string`
107. interface field: `message: string | null`
108. interface field: `status: string`
109. index signature: `[key: string]: unknown` on `RivalData`
110. JSDoc comment: "Profile update fields — only safe client-writable fields"
111. interface declaration: `ProfileUpdate`
112. interface field: `display_name?: string | null` (optional)
113. interface field: `avatar_url?: string | null` (optional)
114. interface field: `bio?: string | null` (optional)
115. interface field: `username?: string | null` (optional)
116. interface field: `preferred_language?: string | null` (optional)
117. interface field: `is_private?: boolean | null` (optional)
118. JSDoc comment: "Auth state change listener"
119. type alias declaration: `AuthListener`
120. type alias value: function type `(user: User | null, profile: Profile | null) => void`
121. function type parameter: `user: User | null`
122. function type parameter: `profile: Profile | null`
123. function type return: `void`
124. JSDoc comment: "Sign-up parameters"
125. interface declaration: `SignUpParams`
126. interface field: `email: string`
127. interface field: `password: string`
128. interface field: `username: string`
129. interface field: `displayName: string`
130. interface field: `dob: string`
131. JSDoc comment: "Log-in parameters"
132. interface declaration: `LogInParams`
133. interface field: `email: string`
134. interface field: `password: string`

## Agent 03

1. JSDoc comment: module header "THE MODERATOR — Auth Type Definitions"
2. JSDoc comment: "Pure types — no runtime code, no imports needed."
3. JSDoc comment: "All auth sub-modules import from here."
4. Import type: `User` from `@supabase/supabase-js`
5. Import type: `Session` from `@supabase/supabase-js`
6. JSDoc comment: "Supabase RPC result shape — matches what supabase.rpc() actually returns"
7. Interface declaration: `SafeRpcResult<T = unknown>`
8. Generic type parameter: `T` with default `unknown` on `SafeRpcResult`
9. Interface field: `data: T | null`
10. Interface field: `error: { message: string; code?: string; status?: number } | null`
11. Inline object type field: `message: string`
12. Inline object type field: `code?: string` (optional)
13. Inline object type field: `status?: number` (optional)
14. JSDoc comment: "Auth operation result — success or failure with error message"
15. Interface declaration: `AuthResult<T = Record<string, unknown>>`
16. Generic type parameter: `T` with default `Record<string, unknown>` on `AuthResult`
17. Interface field: `success: boolean`
18. Interface field: `placeholder?: boolean` (optional)
19. Interface field: `error?: string` (optional)
20. Interface field: `user?: User` (optional)
21. Interface field: `session?: Session | null` (optional)
22. Interface field: `url?: string` (optional)
23. Interface field: `data?: T` (optional)
24. Interface field: `count?: number` (optional)
25. JSDoc comment: "Profile row from the profiles table"
26. Interface declaration: `Profile`
27-55. [identical field list as Agents 01/02]
55. Index signature: `[key: string]: unknown` on `Profile`
56. JSDoc comment: "Public profile returned by get_public_profile RPC"
57-78. [identical PublicProfile fields as Agents 01/02]
79. JSDoc comment: "Follow data row with joined profile"
80-86. [identical FollowRow fields as Agents 01/02]
87. JSDoc comment: "Moderator data for available moderators list"
88-93. [identical ModeratorInfo fields as Agents 01/02]
94. JSDoc comment: "Reference/evidence row"
95-102. [identical DebateReference fields as Agents 01/02]
103. JSDoc comment: "Rival data"
104-109. [identical RivalData fields as Agents 01/02]
110. JSDoc comment: "Profile update fields — only safe client-writable fields"
111-117. [identical ProfileUpdate fields as Agents 01/02]
118. JSDoc comment: "Auth state change listener"
119. Type alias declaration: `AuthListener`
120. Type alias right-hand side: function type `(user: User | null, profile: Profile | null) => void`
121. Function type parameter: `user: User | null`
122. Function type parameter: `profile: Profile | null`
123. Function type return: `void`
124. JSDoc comment: "Sign-up parameters"
125-130. [identical SignUpParams fields as Agents 01/02]
131. JSDoc comment: "Log-in parameters"
132-134. [identical LogInParams fields as Agents 01/02]

## Agent 04

[Output identical to Agent 02 in all material respects — same 134 items, same interface/field/type alias enumeration, no function definitions identified.]

## Agent 05

[Output identical to Agents 02/03/04 in all material respects — same 134 items, same interface/field/type alias enumeration, no function definitions identified.]

---

## Orchestrator Notes

All 5 agents agree: `src/auth.types.ts` is a pure type-declaration module. Contents:
- 1 `import type` statement (User, Session from @supabase/supabase-js)
- 11 exported interface declarations: SafeRpcResult, AuthResult, Profile, PublicProfile, FollowRow, ModeratorInfo, DebateReference, RivalData, ProfileUpdate, SignUpParams, LogInParams
- 1 exported type alias: AuthListener (function type)
- 3 index signatures: on Profile, DebateReference, RivalData
- 0 function definitions
- 0 class declarations
- 0 runtime statements

No agent identified any runtime function definitions. Anchor list will be empty.
