import React from 'react';
import type { Question } from '../types/quiz.types';
import { MCQQuestion } from './QuestionTypes/MCQQuestion';
import { MultiCorrectQuestion } from './QuestionTypes/MultiCorrectQuestion';
import { TrueFalseQuestion } from './QuestionTypes/TrueFalseQuestion';
import { FillBlankQuestion } from './QuestionTypes/FillBlankQuestion';
import { ArrangeStepsQuestion } from './QuestionTypes/ArrangeStepsQuestion';
import { MatchQuestion } from './QuestionTypes/MatchQuestion';
import { CircuitPredictionQuestion } from './QuestionTypes/CircuitPredictionQuestion';
import { BlochSphereQuestion } from './QuestionTypes/BlochSphereQuestion';
import { ImageBasedQuestion } from './QuestionTypes/ImageBasedQuestion';

interface QuestionRendererProps {
  question: Question;
  selectedAnswer: any;
  onSelectAnswer: (val: any) => void;
  disabled?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled
}) => {
  switch (question.type) {
    case 'mcq':
      return (
        <MCQQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'multi_correct':
      return (
        <MultiCorrectQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'true_false':
      return (
        <TrueFalseQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'fill_blank':
      return (
        <FillBlankQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'arrange_steps':
      return (
        <ArrangeStepsQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'match':
      return (
        <MatchQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'circuit_prediction':
      return (
        <CircuitPredictionQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'bloch_sphere':
      return (
        <BlochSphereQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    case 'image_based':
      return (
        <ImageBasedQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
    default:
      return (
        <MCQQuestion
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={onSelectAnswer}
          disabled={disabled}
        />
      );
  }
};
