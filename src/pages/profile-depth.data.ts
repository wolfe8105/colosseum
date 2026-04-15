/**
 * THE MODERATOR — Profile Depth Data
 * 20 sections, 100 questions, 4 milestone rewards. Pure data, zero logic.
 */

import type { Section } from './profile-depth.types.ts';

export const SECTIONS: Section[] = [
  // ── SECTION 1: THE BASICS (5 questions) ──
  {
    id: 'basics', icon: '👤', name: 'THE BASICS',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'b1', label: 'What should people call you?', type: 'input', placeholder: 'Display name' },
      { id: 'b2', label: 'Where are you from?', type: 'input', placeholder: 'City, State' },
      { id: 'b3', label: 'Gender', type: 'chips', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      { id: 'b4', label: 'Age range', type: 'chips', options: ['16-18', '19-24', '25-34', '35-44', '45-54', '55+'] },
      { id: 'b5', label: 'Household income range', type: 'select', options: ['Under $25K', '$25-50K', '$50-75K', '$75-100K', '$100-150K', '$150K+', 'Prefer not to say'] },
    ]
  },
  // ── SECTION 2: POLITICS (5 questions) ──
  {
    id: 'politics', icon: '🏛️', name: 'POLITICS',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'p1', label: 'Where do you lean politically?', type: 'slider', min: 1, max: 10, labels: ['Far Left', 'Far Right'] },
      { id: 'p2', label: 'Top 3 political issues you care about', type: 'chips', multi: true, max: 3, options: ['Economy', 'Immigration', 'Healthcare', 'Climate', 'Education', 'Foreign Policy', 'Gun Rights', 'Social Justice', 'Tax Reform', 'Housing'] },
      { id: 'p3', label: 'How often do you discuss politics?', type: 'chips', options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
      { id: 'p4', label: 'How do you feel about the current direction of the country?', type: 'slider', min: 1, max: 10, labels: ['Wrong track', 'Right direction'] },
      { id: 'p5', label: 'Which best describes your political identity?', type: 'chips', options: ['Party loyalist', 'Independent thinker', 'Single-issue voter', "Don't care about politics"] },
    ]
  },
  // ── SECTION 3: SPORTS (5 questions) ──
  {
    id: 'sports', icon: '🏟️', name: 'SPORTS',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 's1', label: 'Favorite sports (pick up to 3)', type: 'chips', multi: true, max: 3, options: ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'MMA/UFC', 'Boxing', 'College FB', 'College BB', 'Tennis', 'Golf', 'F1'] },
      { id: 's2', label: 'Hottest take you believe about sports?', type: 'input', placeholder: 'e.g. MJ > LeBron, no debate' },
      { id: 's3', label: 'How deep is your sports knowledge?', type: 'slider', min: 1, max: 10, labels: ['Casual', 'Stat Nerd'] },
      { id: 's4', label: 'Do you bet on sports?', type: 'chips', options: ['Regularly', 'Sometimes', 'Rarely', 'Never'] },
      { id: 's5', label: 'How much do you spend on sports per month? (tickets, merch, streaming, betting)', type: 'select', options: ['$0', '$1-25', '$25-50', '$50-100', '$100-250', '$250+'] },
    ]
  },
  // ── SECTION 4: ENTERTAINMENT (5 questions) ──
  {
    id: 'entertainment', icon: '🎬', name: 'ENTERTAINMENT',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'e1', label: 'What do you watch/consume most?', type: 'chips', multi: true, max: 3, options: ['Movies', 'TV Series', 'YouTube', 'Podcasts', 'Anime', 'Reality TV', 'Documentaries', 'Live Sports'] },
      { id: 'e2', label: 'Most overrated movie or show?', type: 'input', placeholder: 'Name it...' },
      { id: 'e3', label: 'Music genre that defines you', type: 'chips', options: ['Hip Hop', 'Rock', 'Pop', 'Country', 'R&B', 'EDM', 'Jazz', 'Latin', 'Classical', 'Metal'] },
      { id: 'e4', label: 'How many streaming services do you pay for?', type: 'select', options: ['0', '1', '2', '3', '4', '5+'] },
      { id: 'e5', label: 'Would you pay $20/mo for one service that had everything?', type: 'chips', options: ['Absolutely', 'Probably', 'Maybe', 'No way'] },
    ]
  },
  // ── SECTION 5: DEBATE STYLE (5 questions) ──
  {
    id: 'debate_style', icon: '⚔️', name: 'DEBATE STYLE',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'd1', label: 'How do you argue?', type: 'chips', options: ['Facts & data', 'Emotion & passion', 'Humor & wit', 'Experience & stories'] },
      { id: 'd2', label: 'When you lose an argument, you...', type: 'chips', options: ['Accept it gracefully', 'Double down', 'Change the subject', 'Research more'] },
      { id: 'd3', label: 'Debate experience level', type: 'slider', min: 1, max: 10, labels: ['First timer', 'Veteran'] },
      { id: 'd4', label: 'What makes you change your mind on something?', type: 'chips', options: ['Strong evidence', 'Personal experience', 'Someone I respect', 'I rarely change my mind'] },
      { id: 'd5', label: 'Do you argue to win or to understand?', type: 'slider', min: 1, max: 10, labels: ['Win', 'Understand'] },
    ]
  },
  // ── SECTION 6: HOT OPINIONS (5 questions) ──
  {
    id: 'opinions', icon: '🔥', name: 'HOT OPINIONS',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'o1', label: 'AI will replace most jobs by 2035', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'o2', label: 'Social media does more harm than good', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'o3', label: 'College is still worth the cost', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'o4', label: 'What hill will you die on?', type: 'input', placeholder: 'Your #1 unpopular opinion' },
      { id: 'o5', label: 'The American Dream is still achievable', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
    ]
  },
  // ── SECTION 7: VALUES (5 questions) ──
  {
    id: 'values', icon: '⚖️', name: 'VALUES',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'v1', label: 'Freedom vs Security — where do you land?', type: 'slider', min: 1, max: 10, labels: ['Freedom', 'Security'] },
      { id: 'v2', label: 'Tradition vs Progress', type: 'slider', min: 1, max: 10, labels: ['Tradition', 'Progress'] },
      { id: 'v3', label: 'Individual vs Collective', type: 'slider', min: 1, max: 10, labels: ['Individual', 'Collective'] },
      { id: 'v4', label: 'Fairness means...', type: 'chips', options: ['Equal outcomes for all', 'Equal opportunity for all', 'People get what they earn', "Life isn't fair"] },
      { id: 'v5', label: 'What matters more in a leader?', type: 'chips', options: ['Strength', 'Empathy', 'Intelligence', 'Honesty'] },
    ]
  },
  // ── SECTION 8: MEDIA DIET (5 questions) ──
  {
    id: 'media', icon: '📱', name: 'MEDIA DIET',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'm1', label: 'Where do you get your news?', type: 'chips', multi: true, max: 3, options: ['TV News', 'Twitter/X', 'Reddit', 'Podcasts', 'Newspapers', 'YouTube', 'TikTok', 'Word of mouth'] },
      { id: 'm2', label: 'Daily screen time (hours)', type: 'slider', min: 1, max: 12, labels: ['1hr', '12hr'] },
      { id: 'm3', label: 'Do you trust mainstream media?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'm4', label: 'How many podcasts do you follow regularly?', type: 'select', options: ['0', '1-2', '3-5', '6-10', '10+'] },
      { id: 'm5', label: 'Which platform do you open first in the morning?', type: 'chips', options: ['Instagram', 'Twitter/X', 'YouTube', 'TikTok', 'Reddit', 'Email', 'News app', 'None'] },
    ]
  },
  // ── SECTION 9: LIFESTYLE (5 questions) ──
  {
    id: 'lifestyle', icon: '🏠', name: 'LIFESTYLE',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'l1', label: 'Education level', type: 'select', options: ['High school', 'Some college', 'Associate', 'Bachelor', 'Master', 'Doctorate', 'Trade school', 'Self-taught'] },
      { id: 'l2', label: 'What field do you work in?', type: 'input', placeholder: 'e.g. Tech, Healthcare, Student...' },
      { id: 'l3', label: 'Urban, suburban, or rural?', type: 'chips', options: ['Urban', 'Suburban', 'Rural'] },
      { id: 'l4', label: 'Do you rent or own your home?', type: 'chips', options: ['Rent', 'Own', 'Live with family', 'Other'] },
      { id: 'l5', label: 'Relationship status', type: 'chips', options: ['Single', 'In a relationship', 'Married', 'Divorced', "It's complicated"] },
    ]
  },
  // ── SECTION 10: COMPETITIVE (5 questions) ──
  {
    id: 'competition', icon: '🏆', name: 'COMPETITIVE',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'c1', label: 'How competitive are you?', type: 'slider', min: 1, max: 10, labels: ['Chill', 'Win at all costs'] },
      { id: 'c2', label: 'Winning matters more than...', type: 'chips', options: ['Being liked', 'Being right', 'Having fun', 'Nothing — winning IS the point'] },
      { id: 'c3', label: 'Best debate strategy', type: 'chips', options: ['Let the facts speak', 'Quick wit', 'Stats & receipts', 'Read the room'] },
      { id: 'c4', label: 'Do you play competitive video games?', type: 'chips', options: ['Ranked grinder', 'Casual player', 'Sometimes', 'Never game'] },
      { id: 'c5', label: 'Ever played in an organized league or tournament?', type: 'chips', options: ['Currently active', 'Used to', "No but I'd try it", 'Not my thing'] },
    ]
  },
  // ── SECTION 11: SOCIAL (5 questions) ──
  {
    id: 'social', icon: '🤝', name: 'SOCIAL',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'x1', label: 'How did you hear about The Moderator?', type: 'chips', options: ['Friend', 'Social media', 'Search', 'Ad', 'Podcast', 'Other'] },
      { id: 'x2', label: 'Would you refer friends?', type: 'chips', options: ['Already did', 'Definitely', 'Maybe', 'Probably not'] },
      { id: 'x3', label: 'What would make this app essential?', type: 'input', placeholder: 'One feature that would hook you...' },
      { id: 'x4', label: 'How many close friends do you have?', type: 'select', options: ['0-1', '2-3', '4-6', '7-10', '10+'] },
      { id: 'x5', label: 'Introvert or extrovert?', type: 'slider', min: 1, max: 10, labels: ['Total introvert', 'Total extrovert'] },
    ]
  },
  // ── SECTION 12: IDENTITY (5 questions) ──
  {
    id: 'identity', icon: '🎭', name: 'IDENTITY',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'i1', label: 'Describe yourself in 3 words', type: 'input', placeholder: 'e.g. stubborn, funny, relentless' },
      { id: 'i2', label: 'Your debate walkout song would be...', type: 'input', placeholder: 'Name the track' },
      { id: 'i3', label: 'If you could debate anyone alive, who?', type: 'input', placeholder: 'Name them' },
      { id: 'i4', label: 'Why did you really download this app?', type: 'chips', options: ['Prove my point', 'Hear other sides', 'Entertainment', 'Get sharper', 'Talk my talk'] },
      { id: 'i5', label: "People who disagree with you would say you're...", type: 'chips', options: ['Stubborn', 'Intimidating', 'Uninformed', 'Actually pretty fair'] },
    ]
  },
  // ── SECTION 13: MONEY (6 questions) ──
  {
    id: 'money', icon: '💰', name: 'MONEY',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'mn1', label: 'How would you describe your financial situation?', type: 'chips', options: ['Comfortable', 'Getting by', 'Struggling', 'Thriving'] },
      { id: 'mn2', label: 'Saver or spender?', type: 'slider', min: 1, max: 10, labels: ['Extreme saver', 'Extreme spender'] },
      { id: 'mn3', label: 'Do you invest?', type: 'chips', options: ['Stocks', 'Crypto', 'Real estate', 'Retirement only', 'No investing'] },
      { id: 'mn4', label: 'How much financial risk are you comfortable with?', type: 'slider', min: 1, max: 10, labels: ['Zero risk', 'YOLO'] },
      { id: 'mn5', label: 'Biggest financial priority right now?', type: 'chips', options: ['Paying off debt', 'Building savings', 'Investing', 'Living my life', 'Supporting family'] },
      { id: 'mn6', label: 'Do you trust banks and financial institutions?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
    ]
  },
  // ── SECTION 14: HEALTH & WELLNESS (5 questions) ──
  {
    id: 'health', icon: '💪', name: 'HEALTH & WELLNESS',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'hw1', label: 'How would you rate your overall health?', type: 'slider', min: 1, max: 10, labels: ['Poor', 'Excellent'] },
      { id: 'hw2', label: 'How often do you exercise?', type: 'chips', options: ['Daily', 'Few times a week', 'Weekly', 'Rarely', 'Never'] },
      { id: 'hw3', label: 'Mental health is just as important as physical health', type: 'slider', min: 1, max: 10, labels: ['Disagree', 'Agree'] },
      { id: 'hw4', label: 'Do you trust doctors and the medical establishment?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'hw5', label: "What's your approach to wellness?", type: 'chips', options: ['Science-based', 'Natural/holistic', 'Mix of both', "Don't think about it"] },
    ]
  },
  // ── SECTION 15: TECHNOLOGY (5 questions) ──
  {
    id: 'technology', icon: '🤖', name: 'TECHNOLOGY',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'tc1', label: 'How do you feel about AI?', type: 'slider', min: 1, max: 10, labels: ['Terrified', 'Excited'] },
      { id: 'tc2', label: "When it comes to new technology, you're a...", type: 'chips', options: ['First adopter', 'Early majority', 'Wait and see', 'Skeptic'] },
      { id: 'tc3', label: 'Phone ecosystem?', type: 'chips', options: ['iPhone', 'Android', "Don't care"] },
      { id: 'tc4', label: 'How much do you care about online privacy?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Extremely'] },
      { id: 'tc5', label: 'Which tech company do you trust the most?', type: 'chips', options: ['Apple', 'Google', 'Microsoft', 'None of them'] },
    ]
  },
  // ── SECTION 16: FOOD & DRINK (5 questions) ──
  {
    id: 'food', icon: '🍔', name: 'FOOD & DRINK',
    reward: { type: 'powerup', text: 'Free Reveal power-up', powerUpId: 'reveal' },
    questions: [
      { id: 'fd1', label: 'Cook at home or eat out?', type: 'slider', min: 1, max: 10, labels: ['Always cook', 'Always eat out'] },
      { id: 'fd2', label: 'Do you drink alcohol?', type: 'chips', options: ['Regularly', 'Socially', 'Rarely', 'Never'] },
      { id: 'fd3', label: 'Any dietary preferences?', type: 'chips', multi: true, max: 2, options: ['No restrictions', 'Vegetarian', 'Vegan', 'Keto/low-carb', 'Gluten-free', 'Halal/Kosher'] },
      { id: 'fd4', label: 'How much do you spend on food delivery per month?', type: 'select', options: ['$0', '$1-25', '$25-50', '$50-100', '$100-200', '$200+'] },
      { id: 'fd5', label: 'Fast food: guilty pleasure or hard pass?', type: 'chips', options: ['Love it', 'Sometimes', 'Rarely', 'Never touch it'] },
    ]
  },
  // ── SECTION 17: SHOPPING & BRANDS (5 questions) ──
  {
    id: 'shopping', icon: '🛍️', name: 'SHOPPING & BRANDS',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'sh1', label: 'When you buy something, you...', type: 'chips', options: ['Research obsessively', 'Ask friends', 'Go with gut', 'Buy the cheapest', 'Buy the brand I know'] },
      { id: 'sh2', label: 'Where do you shop most?', type: 'chips', multi: true, max: 2, options: ['Amazon', 'In-store retail', 'Brand websites', 'TikTok/Instagram shops', 'Thrift/secondhand'] },
      { id: 'sh3', label: 'How brand-loyal are you?', type: 'slider', min: 1, max: 10, labels: ['Always switching', 'Ride or die'] },
      { id: 'sh4', label: 'What makes you try a new brand?', type: 'chips', options: ['Price', 'Friend recommendation', 'Online reviews', 'Ad that got me', 'Influencer'] },
      { id: 'sh5', label: "Biggest purchase you're considering in the next 12 months?", type: 'chips', options: ['Car', 'Home/apartment', 'Electronics', 'Vacation', 'Nothing major'] },
    ]
  },
  // ── SECTION 18: TRUST (5 questions) ──
  {
    id: 'trust', icon: '🔒', name: 'TRUST',
    reward: { type: 'powerup', text: 'Free Silence power-up', powerUpId: 'silence' },
    questions: [
      { id: 'tr1', label: 'How much do you trust the government?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr2', label: 'How much do you trust big corporations?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr3', label: 'How much do you trust the court system?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr4', label: 'How much do you trust science and research institutions?', type: 'slider', min: 1, max: 10, labels: ['Not at all', 'Completely'] },
      { id: 'tr5', label: 'Who do you trust most for information?', type: 'chips', options: ['Experts/academics', 'Friends and family', 'My own research', 'Nobody'] },
    ]
  },
  // ── SECTION 19: WHEELS (5 questions) ──
  {
    id: 'wheels', icon: '🚗', name: 'WHEELS',
    reward: { type: 'powerup', text: 'Free Shield power-up', powerUpId: 'shield' },
    questions: [
      { id: 'wh1', label: 'Do you own a car?', type: 'chips', options: ['Yes — own outright', 'Yes — making payments', "No — don't need one", "No — can't afford one"] },
      { id: 'wh2', label: 'EV, hybrid, or gas?', type: 'chips', options: ['Already drive EV', 'Considering EV', 'Hybrid', 'Gas forever', "Don't care"] },
      { id: 'wh3', label: 'What matters most in a vehicle?', type: 'chips', options: ['Reliability', 'Performance', 'Looks', 'Price', 'Fuel efficiency'] },
      { id: 'wh4', label: 'How do you get around most days?', type: 'chips', options: ['Personal car', 'Public transit', 'Rideshare', 'Bike/walk', 'Work from home'] },
      { id: 'wh5', label: 'When do you plan to buy your next vehicle?', type: 'select', options: ['Within 6 months', 'Within a year', '1-3 years', '3+ years', 'Not planning to'] },
    ]
  },
  // ── SECTION 20: PERSUASION (4 questions) ──
  {
    id: 'persuasion', icon: '🧠', name: 'PERSUASION',
    reward: { type: 'powerup', text: 'Free 2x Multiplier power-up', powerUpId: 'multiplier_2x' },
    questions: [
      { id: 'pr1', label: 'When someone disagrees with you, your first instinct is to...', type: 'chips', options: ['Listen and consider', 'Defend my position', 'Ask why', 'Disengage'] },
      { id: 'pr2', label: 'What kind of evidence do you find most convincing?', type: 'chips', options: ['Statistics and data', 'Expert testimony', 'Personal stories', 'Historical examples'] },
      { id: 'pr3', label: 'How often do you change your mind on important topics?', type: 'chips', options: ['Frequently', 'Sometimes', 'Rarely', 'Almost never'] },
      { id: 'pr4', label: 'Last time you changed your mind about something big, what caused it?', type: 'input', placeholder: 'What shifted your view?' },
    ]
  },
];

export const DEPTH_MILESTONES = [
  { threshold: 25,  icon: '🏷️', name: 'Deep Diver',      desc: 'Unique title' },
  { threshold: 50,  icon: '🖼️', name: 'Insight Frame',    desc: 'Profile border' },
  { threshold: 75,  icon: '✨', name: 'Scholar\u2019s Aura', desc: 'Profile background' },
  { threshold: 100, icon: '🎭', name: 'Grand Reveal',     desc: 'Entrance animation' },
];
