import React from 'react';
import { Check } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  steps: string[];
}

const StepProgress: React.FC<StepProgressProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full mb-8 flex justify-center">
      <div className="flex items-center justify-between max-w-2xl w-full">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex items-center">
                {/* Step Circle */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                      ? 'bg-white text-black ring-4 ring-purple-600/30' 
                      : 'bg-gray-600 text-gray-400'
                  }
                `}>
                  {isCompleted ? <Check size={16} /> : stepNumber}
                </div>
                
                {/* Step Label */}
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    Step {stepNumber}
                  </p>
                  <p className={`text-xs ${
                    isActive ? 'text-gray-300' : isCompleted ? 'text-green-300' : 'text-gray-500'
                  }`}>
                    {step}
                  </p>
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={`h-0.5 transition-all duration-300 ${
                    stepNumber < currentStep ? 'bg-green-500' : 'bg-gray-600'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgress; 