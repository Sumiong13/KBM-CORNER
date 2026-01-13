import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface Advertisement {
  id: number;
  title: string;
  description: string;
  image: string;
  backgroundColor: string;
}

const advertisements: Advertisement[] = [
  {
    id: 1,
    title: '🎉 Welcome to UTM Mandarin Club!',
    description: 'Join us in learning Mandarin and experiencing Chinese culture. New semester starts soon!',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
    backgroundColor: 'from-red-500 to-red-600'
  },
  {
    id: 2,
    title: '📚 Level Up Your Mandarin Skills',
    description: 'Progress through 5 levels with interactive lessons, quizzes, and exams. Get certified!',
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
    backgroundColor: 'from-blue-500 to-blue-600'
  },
  {
    id: 3,
    title: '🎊 Cultural Events & Workshops',
    description: 'Join our exciting cultural events, movie nights, and conversation practice sessions!',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    backgroundColor: 'from-purple-500 to-purple-600'
  },
  {
    id: 4,
    title: '🏆 Earn UTM Certificates',
    description: 'Complete each level and receive official UTM Mandarin Club certificates!',
    image: 'https://images.unsplash.com/photo-1522661067900-ab829854a57f?w=800&q=80',
    backgroundColor: 'from-green-500 to-green-600'
  },
  {
    id: 5,
    title: '💡 Interactive Learning',
    description: 'Attend classes, complete assignments, and get instant feedback from our tutors!',
    image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',
    backgroundColor: 'from-orange-500 to-orange-600'
  }
];

export function AdvertisementSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % advertisements.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? advertisements.length - 1 : prev - 1
    );
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % advertisements.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const currentAd = advertisements[currentIndex];

  return (
    <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-lg shadow-lg">
      {/* Background Image with Overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <img 
            src={currentAd.image} 
            alt={currentAd.title}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${currentAd.backgroundColor} opacity-80`} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center text-white px-8 md:px-16 text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-3xl md:text-4xl">{currentAd.title}</h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl">
              {currentAd.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
        onClick={goToPrevious}
      >
        <ChevronLeft className="w-6 h-6" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-20"
        onClick={goToNext}
      >
        <ChevronRight className="w-6 h-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {advertisements.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-white w-8' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
