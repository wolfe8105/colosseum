/**
 * THE MODERATOR — Profile Depth Types
 */

export interface QuestionBase {
  id: string;
  label: string;
}

export interface InputQuestion extends QuestionBase {
  type: 'input';
  placeholder?: string;
}

export interface ChipsQuestion extends QuestionBase {
  type: 'chips';
  options: string[];
  multi?: boolean;
  max?: number;
}

export interface SliderQuestion extends QuestionBase {
  type: 'slider';
  min: number;
  max: number;
  labels: [string, string];
}

export interface SelectQuestion extends QuestionBase {
  type: 'select';
  options: string[];
}

export type Question = InputQuestion | ChipsQuestion | SliderQuestion | SelectQuestion;

export interface SectionReward {
  type: 'powerup';
  text: string;
  powerUpId: string;
}

export interface Section {
  id: string;
  icon: string;
  name: string;
  reward: SectionReward;
  questions: Question[];
}

export type AnswerValue = string | number | string[];
export type Answers = Record<string, AnswerValue>;
