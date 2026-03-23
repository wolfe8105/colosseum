# PROFILE DEPTH QUESTION EXPANSION — B2B Data Spec
## Session 164 | The Moderator

### Goal
Expand from 38 questions (12 sections) to 104 questions (20 sections).
Unlocks all tier thresholds: Spectator+(10), Contender(25), Gladiator(50), Champion(75), Legend(100).

### Design Principles
- Small sections (4-6 questions each) — feels fast, not tedious
- Questions feel like personality/identity prompts, not corporate surveys
- Every question maps to at least one B2B buyer's data needs
- Mix of types: chips (quick taps), sliders (spectrum), input (personality), select (structured)
- No question should feel like it has a "right" answer

### B2B Buyer Key (referenced in each section)
1=Political campaigns, 2=Market research firms, 3=Political consultancies,
4=Ad agencies, 5=Sports betting/DFS, 6=Media companies, 7=Consumer brands,
8=Entertainment/gaming, 9=Financial services, 10=Litigation consulting,
11=Health/pharma, 12=Think tanks

---

## SECTION 1: THE BASICS
**Icon:** 👤 | **Reward:** $1 off subscription | **B2B:** ALL (index key)
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| b1 | What should people call you? | input | placeholder: "Display name" |
| b2 | Where are you from? | input | placeholder: "City, State" |
| b3 | Gender | chips | Male, Female, Non-binary, Prefer not to say |
| b4 | Age range | chips | 16-18, 19-24, 25-34, 35-44, 45-54, 55+ |
| b5 | Household income range | select | Under $25K, $25-50K, $50-75K, $75-100K, $100-150K, $150K+, Prefer not to say |

**Changes from current:** Added b5 (income). Critical for ALL buyers — it's the #1 cross-tab variable after age/gender.

---

## SECTION 2: POLITICS
**Icon:** 🏛️ | **Reward:** Unlock "Policy Wonk" badge | **B2B:** 1, 2, 3, 10, 12
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| p1 | Where do you lean politically? | slider | min:1, max:10, labels: ["Far Left", "Far Right"] |
| p2 | Top 3 political issues you care about | chips/multi/max:3 | Economy, Immigration, Healthcare, Climate, Education, Foreign Policy, Gun Rights, Social Justice, Tax Reform, Housing |
| p3 | How often do you discuss politics? | chips | Daily, Weekly, Monthly, Rarely |
| p4 | How do you feel about the current direction of the country? | slider | min:1, max:10, labels: ["Wrong track", "Right direction"] |
| p5 | Which best describes your political identity? | chips | Party loyalist, Independent thinker, Single-issue voter, Don't care about politics |

**Changes from current:** Added p4 (country direction — #1 political polling question, massive value for buyers 1/3/12) and p5 (political identity type — valuable for persuadability modeling).

---

## SECTION 3: SPORTS
**Icon:** 🏟️ | **Reward:** Unlock "Arena Glow" profile effect | **B2B:** 2, 5, 7
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| s1 | Favorite sports (pick up to 3) | chips/multi/max:3 | NFL, NBA, MLB, NHL, Soccer, MMA/UFC, Boxing, College FB, College BB, Tennis, Golf, F1 |
| s2 | Hottest take you believe about sports? | input | placeholder: "e.g. MJ > LeBron, no debate" |
| s3 | How deep is your sports knowledge? | slider | min:1, max:10, labels: ["Casual", "Stat Nerd"] |
| s4 | Do you bet on sports? | chips | Regularly, Sometimes, Rarely, Never |
| s5 | How much do you spend on sports per month? (tickets, merch, streaming, betting) | select | $0, $1-25, $25-50, $50-100, $100-250, $250+ |

**Changes from current:** Added s4 (betting frequency — direct value for buyer 5, DraftKings/FanDuel would pay for this) and s5 (sports spend — gold for buyer 7 consumer brands).

---

## SECTION 4: ENTERTAINMENT
**Icon:** 🎬 | **Reward:** Unlock "Critic" badge | **B2B:** 2, 6, 7, 8
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| e1 | What do you watch/consume most? | chips/multi/max:3 | Movies, TV Series, YouTube, Podcasts, Anime, Reality TV, Documentaries, Live Sports |
| e2 | Most overrated movie or show? | input | placeholder: "Name it..." |
| e3 | Music genre that defines you | chips | Hip Hop, Rock, Pop, Country, R&B, EDM, Jazz, Latin, Classical, Metal |
| e4 | How many streaming services do you pay for? | select | 0, 1, 2, 3, 4, 5+ |
| e5 | Would you pay $20/mo for one service that had everything? | chips | Absolutely, Probably, Maybe, No way |

**Changes from current:** Added e4 (streaming count — direct value for buyer 6 media companies) and e5 (willingness to pay — content pricing signal).

---

## SECTION 5: DEBATE STYLE
**Icon:** ⚔️ | **Reward:** $1.50 off subscription | **B2B:** 3, 10
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| d1 | How do you argue? | chips | Facts & data, Emotion & passion, Humor & wit, Experience & stories |
| d2 | When you lose an argument, you... | chips | Accept it gracefully, Double down, Change the subject, Research more |
| d3 | Debate experience level | slider | min:1, max:10, labels: ["First timer", "Veteran"] |
| d4 | What makes you change your mind on something? | chips | Strong evidence, Personal experience, Someone I respect, I rarely change my mind |
| d5 | Do you argue to win or to understand? | slider | min:1, max:10, labels: ["Win", "Understand"] |

**Changes from current:** Added d4 (persuadability — huge value for buyer 10 litigation consulting and buyer 1 political campaigns) and d5 (argument motivation — models juror/voter behavior).

---

## SECTION 6: HOT OPINIONS
**Icon:** 🔥 | **Reward:** Unlock "Flame Border" profile frame | **B2B:** 2, 4, 7, 12
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| o1 | AI will replace most jobs by 2035 | slider | min:1, max:10, labels: ["Disagree", "Agree"] |
| o2 | Social media does more harm than good | slider | min:1, max:10, labels: ["Disagree", "Agree"] |
| o3 | College is still worth the cost | slider | min:1, max:10, labels: ["Disagree", "Agree"] |
| o4 | What hill will you die on? | input | placeholder: "Your #1 unpopular opinion" |
| o5 | The American Dream is still achievable | slider | min:1, max:10, labels: ["Disagree", "Agree"] |

**Changes from current:** Added o5 (American Dream — economic optimism signal, valuable for buyers 7/9/12). o1-o4 unchanged.

---

## SECTION 7: VALUES
**Icon:** ⚖️ | **Reward:** $1.50 off subscription | **B2B:** 1, 3, 10, 12
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| v1 | Freedom vs Security — where do you land? | slider | min:1, max:10, labels: ["Freedom", "Security"] |
| v2 | Tradition vs Progress | slider | min:1, max:10, labels: ["Tradition", "Progress"] |
| v3 | Individual vs Collective | slider | min:1, max:10, labels: ["Individual", "Collective"] |
| v4 | Fairness means... | chips | Equal outcomes for all, Equal opportunity for all, People get what they earn, Life isn't fair |
| v5 | What matters more in a leader? | chips | Strength, Empathy, Intelligence, Honesty |

**Changes from current:** Added v4 (fairness framing — core political/jury psychology variable) and v5 (leadership values — campaign messaging signal).

---

## SECTION 8: MEDIA DIET
**Icon:** 📱 | **Reward:** Unlock "Informed" badge | **B2B:** 1, 2, 3, 4, 6, 8
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| m1 | Where do you get your news? | chips/multi/max:3 | TV News, Twitter/X, Reddit, Podcasts, Newspapers, YouTube, TikTok, Word of mouth |
| m2 | Daily screen time (hours) | slider | min:1, max:12, labels: ["1hr", "12hr"] |
| m3 | Do you trust mainstream media? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |
| m4 | How many podcasts do you follow regularly? | select | 0, 1-2, 3-5, 6-10, 10+ |
| m5 | Which platform do you open first in the morning? | chips | Instagram, Twitter/X, YouTube, TikTok, Reddit, Email, News app, None |

**Changes from current:** Added m4 (podcast depth — media companies pay for this) and m5 (first-touch platform — ad agencies would kill for this signal).

---

## SECTION 9: LIFESTYLE
**Icon:** 🏠 | **Reward:** $2 off subscription | **B2B:** 2, 4, 7
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| l1 | Education level | select | High school, Some college, Associate, Bachelor, Master, Doctorate, Trade school, Self-taught |
| l2 | What field do you work in? | input | placeholder: "e.g. Tech, Healthcare, Student..." |
| l3 | Urban, suburban, or rural? | chips | Urban, Suburban, Rural |
| l4 | Do you rent or own your home? | chips | Rent, Own, Live with family, Other |
| l5 | Relationship status | chips | Single, In a relationship, Married, Divorced, It's complicated |

**Changes from current:** Added l4 (homeownership — massive cross-tab variable for financial and consumer buyers) and l5 (relationship status — standard demographic, missing until now).

---

## SECTION 10: COMPETITIVE
**Icon:** 🏆 | **Reward:** Unlock "Gold Crown" icon | **B2B:** 4, 5, 8
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| c1 | How competitive are you? | slider | min:1, max:10, labels: ["Chill", "Win at all costs"] |
| c2 | Winning matters more than... | chips | Being liked, Being right, Having fun, Nothing — winning IS the point |
| c3 | Best debate strategy | chips | Let the facts speak, Quick wit, Stats & receipts, Read the room |
| c4 | Do you play competitive video games? | chips | Ranked grinder, Casual player, Sometimes, Never game |
| c5 | Ever played in an organized league or tournament? (sports, esports, debate, chess, etc.) | chips | Currently active, Used to, No but I'd try it, Not my thing |

**Changes from current:** Added c4 (gaming competitiveness — direct value for buyer 8 gaming studios) and c5 (organized competition history — engagement propensity signal).

---

## SECTION 11: SOCIAL
**Icon:** 🤝 | **Reward:** Unlock custom bio | **B2B:** 2, 4, 7
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| x1 | How did you hear about The Moderator? | chips | Friend, Social media, Search, Ad, Podcast, Other |
| x2 | Would you refer friends? | chips | Already did, Definitely, Maybe, Probably not |
| x3 | What would make this app essential? | input | placeholder: "One feature that would hook you..." |
| x4 | How many close friends do you have? | select | 0-1, 2-3, 4-6, 7-10, 10+ |
| x5 | Introvert or extrovert? | slider | min:1, max:10, labels: ["Total introvert", "Total extrovert"] |

**Changes from current:** Added x4 (social circle size — influences reach and referral modeling) and x5 (introvert/extrovert — core psychographic, valuable for buyers 4/7).

---

## SECTION 12: IDENTITY
**Icon:** 🎭 | **Reward:** $3 off — final discount! Down to $0.49 | **B2B:** 2, 4, 10
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| i1 | Describe yourself in 3 words | input | placeholder: "e.g. stubborn, funny, relentless" |
| i2 | Your debate walkout song would be... | input | placeholder: "Name the track" |
| i3 | If you could debate anyone alive, who? | input | placeholder: "Name them" |
| i4 | What's your reputation among friends? | chips | The smart one, The funny one, The loud one, The chill one, The wild card |
| i5 | People who disagree with you would say you're... | chips | Stubborn, Intimidating, Uninformed, Actually pretty fair |

**Changes from current:** Added i4 (self-perceived social role — psychographic gold) and i5 (self-awareness of opposition perception — models how they'd perform as juror/voter).

---

## SECTION 13: MONEY 💰 (NEW)
**Icon:** 💰 | **Reward:** Unlock "High Roller" badge | **B2B:** 2, 7, 9
**Questions: 6**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| mn1 | How would you describe your financial situation? | chips | Comfortable, Getting by, Struggling, Thriving |
| mn2 | Saver or spender? | slider | min:1, max:10, labels: ["Extreme saver", "Extreme spender"] |
| mn3 | Do you invest? | chips | Stocks, Crypto, Real estate, Retirement only, No investing |
| mn4 | How much financial risk are you comfortable with? | slider | min:1, max:10, labels: ["Zero risk", "YOLO"] |
| mn5 | What's your biggest financial priority right now? | chips | Paying off debt, Building savings, Investing, Living my life, Supporting family |
| mn6 | Do you trust banks and financial institutions? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |

**Why new:** Zero financial questions existed. Buyer 9 (financial services) needs risk tolerance, investment behavior, institutional trust. Buyer 7 (consumer brands) needs spending philosophy. Buyer 2 (market research) needs all of it.

---

## SECTION 14: HEALTH & WELLNESS 💪 (NEW)
**Icon:** 💪 | **Reward:** Unlock "Iron Will" profile effect | **B2B:** 2, 7, 11
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| hw1 | How would you rate your overall health? | slider | min:1, max:10, labels: ["Poor", "Excellent"] |
| hw2 | How often do you exercise? | chips | Daily, Few times a week, Weekly, Rarely, Never |
| hw3 | Mental health is just as important as physical health | slider | min:1, max:10, labels: ["Disagree", "Agree"] |
| hw4 | Do you trust doctors and the medical establishment? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |
| hw5 | What's your approach to wellness? | chips | Science-based, Natural/holistic, Mix of both, Don't think about it |

**Why new:** Buyer 11 (health/pharma) needs trust in medical establishment, wellness approach, exercise habits. This is a growing market — pharma companies spend billions on patient sentiment research.

---

## SECTION 15: TECHNOLOGY 🤖 (NEW)
**Icon:** 🤖 | **Reward:** Unlock "Tech Lord" badge | **B2B:** 2, 4, 7, 8
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| tc1 | How do you feel about AI? | slider | min:1, max:10, labels: ["Terrified", "Excited"] |
| tc2 | When it comes to new technology, you're a... | chips | First adopter, Early majority, Wait and see, Skeptic |
| tc3 | Phone ecosystem? | chips | iPhone, Android, Don't care |
| tc4 | How much do you care about online privacy? | slider | min:1, max:10, labels: ["Not at all", "Extremely"] |
| tc5 | Which tech company do you trust the most? | chips | Apple, Google, Microsoft, None of them |

**Why new:** AI sentiment is the hottest data point in 2026. Buyer 4 (ad agencies) needs platform preferences for targeting. Buyer 7 needs brand trust signals. Phone ecosystem alone is worth significant money to device/app companies.

---

## SECTION 16: FOOD & DRINK 🍔 (NEW)
**Icon:** 🍔 | **Reward:** Unlock "Foodie" badge | **B2B:** 2, 7
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| fd1 | Cook at home or eat out? | slider | min:1, max:10, labels: ["Always cook", "Always eat out"] |
| fd2 | Do you drink alcohol? | chips | Regularly, Socially, Rarely, Never |
| fd3 | Any dietary preferences? | chips/multi/max:2 | No restrictions, Vegetarian, Vegan, Keto/low-carb, Gluten-free, Halal/Kosher |
| fd4 | How much do you spend on food delivery per month? | select | $0, $1-25, $25-50, $50-100, $100-200, $200+ |
| fd5 | Fast food: guilty pleasure or hard pass? | chips | Love it, Sometimes, Rarely, Never touch it |

**Why new:** CPG and food/bev brands (buyer 7) spend more on consumer panel data than almost anyone. Dining habits, alcohol consumption, dietary restrictions, and delivery spend are top-tier data points. Restaurant categories alone generated $7,127/household/year per NIQ data.

---

## SECTION 17: SHOPPING & BRANDS 🛍️ (NEW)
**Icon:** 🛍️ | **Reward:** $1 off subscription | **B2B:** 2, 4, 7
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| sh1 | When you buy something, you... | chips | Research obsessively, Ask friends, Go with gut, Buy the cheapest, Buy the brand I know |
| sh2 | Where do you shop most? | chips/multi/max:2 | Amazon, In-store retail, Brand websites, TikTok/Instagram shops, Thrift/secondhand |
| sh3 | How brand-loyal are you? | slider | min:1, max:10, labels: ["Always switching", "Ride or die"] |
| sh4 | What makes you try a new brand? | chips | Price, Friend recommendation, Online reviews, Ad that got me, Influencer |
| sh5 | Biggest purchase you're considering in the next 12 months? | chips | Car, Home/apartment, Electronics, Vacation, Nothing major |

**Why new:** Purchase behavior is THE core data product for buyer 7 (consumer brands) and buyer 4 (ad agencies). Purchase intent (sh5) is especially valuable — it signals who's in-market right now.

---

## SECTION 18: TRUST 🔒 (NEW)
**Icon:** 🔒 | **Reward:** Unlock "Truth Seeker" badge | **B2B:** 1, 3, 10, 11, 12
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| tr1 | How much do you trust the government? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |
| tr2 | How much do you trust big corporations? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |
| tr3 | How much do you trust the court system? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |
| tr4 | How much do you trust science and research institutions? | slider | min:1, max:10, labels: ["Not at all", "Completely"] |
| tr5 | Who do you trust most for information? | chips | Experts/academics, Friends and family, My own research, Nobody |

**Why new:** Institutional trust is the single most requested data point from buyers 1 (political), 10 (litigation), 11 (health/pharma), and 12 (think tanks). Jury consultants specifically model court trust (tr3). Pharma needs science trust (tr4). Campaigns need government trust (tr1). This section alone could justify a B2B deal.

---

## SECTION 19: WHEELS 🚗 (NEW)
**Icon:** 🚗 | **Reward:** Unlock "Road Warrior" badge | **B2B:** 2, 4, 7
**Questions: 5**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| wh1 | Do you own a car? | chips | Yes — own outright, Yes — making payments, No — don't need one, No — can't afford one |
| wh2 | EV, hybrid, or gas? | chips | Already drive EV, Considering EV, Hybrid, Gas forever, Don't care |
| wh3 | What matters most in a vehicle? | chips | Reliability, Performance, Looks, Price, Fuel efficiency |
| wh4 | How do you get around most days? | chips | Personal car, Public transit, Rideshare, Bike/walk, Work from home |
| wh5 | When do you plan to buy your next vehicle? | select | Within 6 months, Within a year, 1-3 years, 3+ years, Not planning to |

**Why new:** Automotive is one of the highest-spend categories in advertising. Male 16-65 is the primary auto buyer demographic. EV sentiment (wh2) is the #1 question every auto OEM wants answered right now. Purchase timeline (wh5) identifies in-market buyers.

---

## SECTION 20: PERSUASION 🧠 (NEW)
**Icon:** 🧠 | **Reward:** Unlock "Mind Reader" profile effect | **B2B:** 1, 3, 4, 10
**Questions: 4**

| ID | Label | Type | Options/Config |
|----|-------|------|----------------|
| pr1 | When someone disagrees with you, your first instinct is to... | chips | Listen and consider, Defend my position, Ask why, Disengage |
| pr2 | What kind of evidence do you find most convincing? | chips | Statistics and data, Expert testimony, Personal stories, Historical examples |
| pr3 | How often do you change your mind on important topics? | chips | Frequently, Sometimes, Rarely, Almost never |
| pr4 | The last time you changed your mind about something big, what caused it? | input | placeholder: "What shifted your view?" |

**Why new:** Persuadability modeling. Buyer 10 (litigation consulting) pays $10K-$1M per case to understand how jurors process evidence. Buyer 1 (political campaigns) needs to identify persuadable voters. Buyer 4 (ad agencies) needs to know what moves people. This is the highest-value-per-question section in the entire questionnaire.

---

## SUMMARY

| # | Section | Questions | Status |
|---|---------|-----------|--------|
| 1 | The Basics | 5 | Modified (added income) |
| 2 | Politics | 5 | Modified (added 2) |
| 3 | Sports | 5 | Modified (added betting + spend) |
| 4 | Entertainment | 5 | Modified (added 2) |
| 5 | Debate Style | 5 | Modified (added 2) |
| 6 | Hot Opinions | 5 | Modified (added 1) |
| 7 | Values | 5 | Modified (added 2) |
| 8 | Media Diet | 5 | Modified (added 2) |
| 9 | Lifestyle | 5 | Modified (added 2) |
| 10 | Competitive | 5 | Modified (added 2) |
| 11 | Social | 5 | Modified (added 2) |
| 12 | Identity | 5 | Modified (added 2) |
| 13 | Money | 6 | **NEW** |
| 14 | Health & Wellness | 5 | **NEW** |
| 15 | Technology | 5 | **NEW** |
| 16 | Food & Drink | 5 | **NEW** |
| 17 | Shopping & Brands | 5 | **NEW** |
| 18 | Trust | 5 | **NEW** |
| 19 | Wheels | 5 | **NEW** |
| 20 | Persuasion | 4 | **NEW** |
| | **TOTAL** | **104** | |

## BUYER COVERAGE MATRIX

Each buyer gets data from multiple sections:

| Buyer | Sections That Serve Them | Data Points |
|-------|--------------------------|-------------|
| 1. Political campaigns | 1,2,5,7,8,18,20 | 35 |
| 2. Market research firms | ALL 20 | 104 |
| 3. Political consultancies | 2,5,7,8,11,18,20 | 35 |
| 4. Ad agencies | 2,4,7,8,11,15,17,19,20 | 46 |
| 5. Sports betting/DFS | 1,3,10 | 15 |
| 6. Media/streaming | 4,8 | 10 |
| 7. Consumer brands | 1,3,4,9,11,13,14,15,16,17,19 | 57 |
| 8. Entertainment/gaming | 4,8,10,11,15 | 25 |
| 9. Financial services | 1,9,13 | 16 |
| 10. Litigation consulting | 2,5,7,12,18,20 | 29 |
| 11. Health/pharma | 14,18 | 10 |
| 12. Think tanks | 2,6,7,18 | 20 |

## TIER PROGRESSION

With 104 questions, the tier curve becomes:
- **Unranked (0):** Haven't started
- **Spectator+ (10):** ~2 complete sections
- **Contender (25):** ~5 complete sections
- **Gladiator (50):** ~10 complete sections
- **Champion (75):** ~15 complete sections
- **Legend (100):** ~20 complete sections (all or nearly all)

This means a motivated user reaches Legend by completing the full questionnaire — exactly as designed.

## IMPLEMENTATION NOTES

1. **No schema changes needed.** Questions save to the same `profile_depth` structure via `save_profile_depth` RPC.
2. **No RPC changes needed.** `increment_questions_answered` works with any count.
3. **No tier threshold changes needed.** 0/10/25/50/75/100 is perfect for 104 questions.
4. **File changed:** `src/pages/profile-depth.ts` — SECTIONS array only.
5. **Existing answers preserved.** All current question IDs (b1-b4, p1-p3, s1-s3, etc.) are unchanged. New questions get new IDs. No user data lost.
6. **Grid layout:** 20 sections in a grid. Currently 12 sections in a 3×4 grid. 20 sections = 4×5 grid or responsive wrap.
7. **HTML page:** `moderator-profile-depth.html` may need grid CSS adjustment for 20 sections.
