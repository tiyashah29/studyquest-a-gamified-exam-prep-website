import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { axiosInstance } from '@/App';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Shield } from 'lucide-react';
import AntiCheatModal from '@/components/AntiCheatModal';

export default function Quiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quiz && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  const fetchQuiz = async () => {
    try {
      const response = await axiosInstance.get(`/quizzes/${quizId}`);
      setQuiz(response.data);
      setTimeLeft(response.data.time_limit);
      setAnswers(new Array(response.data.questions.length).fill(-1));
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/topics');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleWarning = (count) => {
    setWarningCount(count);
    toast.error(`Anti-Cheat Warning ${count}/3: Tab switching detected!`, {
      duration: 5000,
    });
  };

  const handleMaxWarnings = () => {
    toast.error('You have been logged out due to repeated tab switching violations.', {
      duration: 5000,
    });
    
    // Log out the user
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  };

  const handleSubmit = async () => {
    if (answers.includes(-1)) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    try {
      const timeTaken = quiz.time_limit - timeLeft;
      const response = await axiosInstance.post('/quiz/submit', {
        quiz_id: quizId,
        answers: answers,
        time_taken: timeTaken
      });
      setResult(response.data);
      setSubmitted(true);
      toast.success('Quiz submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit quiz');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="quiz-loading">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="quiz-results">
        <div className="max-w-2xl w-full glass p-8 animate-fade-in">
          <div className="text-center mb-8">
            {result.score >= 80 ? (
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
            )}
            <h1 className="text-4xl font-bold gradient-text mb-2">Quiz Complete!</h1>
            <p className="text-slate-400">Great effort! Here are your results:</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="stat-card" data-testid="result-score">
              <div className="stat-value">{result.score}%</div>
              <div className="stat-label">Your Score</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card" data-testid="result-correct">
                <div className="text-2xl font-bold text-green-400">
                  {result.correct_answers}/{result.total_questions}
                </div>
                <div className="stat-label">Correct Answers</div>
              </div>

              <div className="stat-card" data-testid="result-xp">
                <div className="text-2xl font-bold text-blue-400">+{result.xp_earned}</div>
                <div className="stat-label">XP Earned</div>
              </div>
            </div>

            {result.badges_earned && result.badges_earned.length > 0 && (
              <div className="card" data-testid="result-badges">
                <h3 className="font-semibold mb-2">New Badges Earned!</h3>
                <div className="flex gap-2 flex-wrap">
                  {result.badges_earned.map((badge, index) => (
                    <span key={index} className="badge">{badge}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/topics')}
              className="flex-1 btn-primary"
              data-testid="back-to-topics"
            >
              Back to Topics
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
              data-testid="view-dashboard"
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const question = quiz.questions[currentQuestion];

  return (
    <div className="min-h-screen p-4" data-testid="quiz-page">
      {/* Anti-Cheat Modal */}
      <AntiCheatModal
        isActive={!submitted}
        onWarning={handleWarning}
        onMaxWarnings={handleMaxWarnings}
        warningCount={warningCount}
      />

      <div className="max-w-4xl mx-auto">
        {/* Anti-Cheat Warning Banner */}
        <div className="bg-red-950/20 border border-red-500 rounded-lg p-3 mb-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-400" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-semibold">
              Anti-Cheat Active: Do not switch tabs or minimize browser
            </p>
            <p className="text-xs text-slate-400">
              Warnings: {warningCount}/3 • You will be logged out after 3 warnings
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="glass p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{quiz.title}</h2>
            <div className="flex items-center gap-2 text-lg" data-testid="quiz-timer">
              <Clock className={`w-5 h-5 ${timeLeft < 60 ? 'text-red-400' : 'text-blue-400'}`} />
              <span className={timeLeft < 60 ? 'text-red-400' : ''}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" data-testid="quiz-progress" />
          <p className="text-sm text-slate-400 mt-2">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </p>
        </div>

        {/* Question */}
        <div className="glass p-8 mb-6 animate-fade-in" data-testid="question-card">
          <h3 className="text-2xl font-semibold mb-6">{question.question}</h3>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQuestion] === index
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
                data-testid={`option-${index}`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}. </span>
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            variant="outline"
            className="border-slate-600 text-slate-300"
            data-testid="previous-button"
          >
            Previous
          </Button>
          
          {currentQuestion === quiz.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={answers.includes(-1)}
              className="flex-1 btn-primary"
              data-testid="submit-button"
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex-1 btn-primary"
              data-testid="next-button"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}