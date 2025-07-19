import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight, Play, Zap, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QItem {
  question: string;
  avatarUrl: string;
}
interface AItem {
  answer: string;
  avatarUrl: string;
}

const qItems: QItem[] = [
  {
    question: '음악 작업에도 버전 관리가 필요할까요?',
    avatarUrl: './person/IMG_2052.jpg',
  },
  {
    question: '버전 간 차이를 어떻게 확인할 수 있나요?',
    avatarUrl: './person/IMG_6287.png',
  },
  {
    question: '기존 DAW에서는 이런 기능이 없던데요?',
    avatarUrl: './person/IMG_6287.png',
  },
  {
    question: '음악 작업, 혼자서도 잘 하는데 협업 도구가 왜 필요하죠?',
    avatarUrl: './person/IMG_6287.png',
  },
  {
    question:
      '팀원들과 파일을 주고받는 게 너무 번거로운데, 해결 방법이 있나요?',
    avatarUrl: './person/IMG_6287.png',
  },
  {
    question: '실시간으로 팀원들과 의견을 나눌 수 있나요?',
    avatarUrl: './person/IMG_6287.png',
  },
];

const aItems: AItem[] = [
  {
    answer:
      '물론입니다. 음악도 코드처럼 반복적으로 수정하고 발전시켜 나가는 작업이에요.WavefloW는 각 스템(stem)과 트랙의 변경 내역을 체계적으로 기록하고, 필요할 때 언제든지 이전 버전으로 돌아갈 수 있도록 도와줍니다.',
    avatarUrl: './person/IMG_6287.jpg',
  },
  {
    answer:
      'WavefloW에서는 시각적인 파형 비교를 기반으로 두 버전의 차이를 쉽게 확인할 수 있어요.',
    avatarUrl: './person/1750813233213.jpg',
  },
  {
    answer:
      'WavefloW는 기존 DAW의 한계를 보완하는 음악 전용 버전 관리 플랫폼이에요.\n작업물을 파일로만 주고받는 시대는 끝났습니다.',
    avatarUrl: './person/1750813233213.jpg',
  },
  {
    answer:
      'WavefloW는 여러 아티스트, 프로듀서, 엔지니어가 동시에 작업하더라도\n버전 충돌 없이 안정적으로 협업할 수 있는 환경을 제공합니다.\n누가 언제 어떤 부분을 수정했는지 모두 기록되고, 필요한 시점으로 되돌리는 것도 간단합니다.',
    avatarUrl: './person/1750813233213.jpg',
  },
  {
    answer:
      'WavefloW에서는 파일 주고받기가 필요 없습니다.\n모든 트랙과 스템은 실시간으로 공유되며,\n버전마다 다른 멤버의 의견이나 수정 사항도 손쉽게 확인할 수 있어요.',
    avatarUrl: './person/1750813233213.jpg',
  },
  {
    answer:
      '가능합니다.\nWavefloW에서는 트랙의 특정 구간에 시간 코드 기반 코멘트를 남기고,\n동료들과 바로 피드백을 주고받을 수 있어요.\n피드백을 잃지 않고 기록으로 남기면서도, 빠르게 반영할 수 있습니다.',
    avatarUrl: './person/1750813233213.jpg',
  },
];

const WaveCanvas = () => {
  useEffect(() => {
    const canvas = document.getElementById('wave-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    let animationFrameId: number;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let wavePhase = 0;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Multiple wave layers for depth
      const waves = [
        { amplitude: 30, frequency: 0.008, phase: wavePhase, alpha: 0.3 },
        { amplitude: 50, frequency: 0.012, phase: wavePhase * 0.8, alpha: 0.5 },
        { amplitude: 25, frequency: 0.015, phase: wavePhase * 1.2, alpha: 0.7 },
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${wave.alpha})`;

        for (let x = 0; x < canvas.width; x++) {
          const y =
            canvas.height / 2 +
            wave.amplitude * Math.sin(x * wave.frequency + wave.phase);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      wavePhase += 0.02;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <canvas
      id='wave-canvas'
      className='pointer-events-none absolute left-0 top-0 z-10 h-full w-full opacity-40'
    />
  );
};

const FadeInWhenVisible: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    className='group relative overflow-hidden rounded-3xl border border-slate-700/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/50'
  >
    <div className='absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
    <div className='relative z-10'>
      <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r'>
        <Icon className='h-6 w-6 text-white' />
      </div>
      <h3 className='mb-3 text-xl font-bold text-white'>{title}</h3>
      <p className='leading-relaxed text-slate-300'>{description}</p>
    </div>
    <div className='absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100' />
  </motion.div>
);

const LandingPage2: React.FC = () => {
  const ref = useRef(null);
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  // const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  return (
    <div className='min-h-screen overflow-y-auto overflow-x-hidden bg-slate-950 font-sans text-white antialiased'>
      {/* Header */}
      <header className='sticky top-0 z-50 flex w-full items-center justify-between border-b border-slate-800/50 bg-slate-950/80 px-6 py-4 backdrop-blur-xl'>
        <div className='flex items-center space-x-3'>
          <div className='bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-bold text-transparent'>
            WavefloW
          </div>
        </div>
        <div className='flex w-full justify-end gap-3 px-6 pt-4'>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className='group flex items-center gap-2 rounded-full bg-gradient-to-r px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-violet-500/25'
            onClick={() => navigate('/login')}
          >
            Sign In
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className='group flex items-center gap-2 rounded-full bg-gradient-to-r px-6 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg hover:shadow-violet-500/25'
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={ref} className='relative min-h-screen overflow-hidden'>
        {/* <motion.div
          style={{ scale, opacity }}
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black"
        /> */}

        {/* <motion.img
          src='/hand-1850120_1280.jpg'
          alt='background'
          className='absolute left-0 top-0 z-0 h-full w-full object-cover opacity-20'
          style={{ scale }}
        /> */}
        <motion.img
          src='/hand-1850120_1280.jpg'
          alt='background'
          className='absolute left-0 top-0 z-0 h-full w-full'
          style={{ scale, filter: 'brightness(0.8)' }}
        />

        <WaveCanvas />

        <div className='relative z-20 flex min-h-screen items-center justify-center px-6'>
          <div className='max-w-5xl text-center'>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className='mb-6'
            >
              <span className='inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300'>
                <Zap className='h-4 w-4' />
                Music Version Control Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className='mb-6 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-6xl font-black leading-tight text-transparent md:text-8xl'
            >
              WAVE
              <span className='block bg-gradient-to-r bg-clip-text text-transparent'>
                FLOW
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
              className='flex flex-col items-center justify-center gap-4 sm:flex-row'
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='group flex items-center gap-3 rounded-full bg-gradient-to-r px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-violet-500/25 transition-all hover:shadow-2xl hover:shadow-violet-500/40'
                onClick={() => navigate('/signup')}
              >
                무료로 시작하기
                <ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
              </motion.button>
            </motion.div>
          </div>
        </div>

        <div className='absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-slate-950/80' />
      </section>

      {/* Features Overview */}
      <FadeInWhenVisible>
        <section className='px-6 py-32'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-20 text-center'>
              <h2 className='mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl'>
                음악 작업의 혁신
              </h2>
              <p className='mx-auto max-w-3xl text-xl text-slate-400'>
                WavefloW는 음악 제작 과정에서 발생하는 모든 변경사항을 추적하고,
                팀원들과의 협업을 원활하게 만들어주는 플랫폼입니다.
              </p>
            </div>

            <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
              <FeatureCard
                icon={Clock}
                title='스마트 버전 관리'
                description='모든 트랙과 스템의 변경 내역을 자동으로 기록하고, 언제든지 이전 버전으로 되돌릴 수 있습니다.'
              />
              <FeatureCard
                icon={Users}
                title='실시간 협업'
                description='팀원들과 실시간으로 피드백을 주고받으며, 버전 충돌 없이 안정적으로 작업할 수 있습니다.'
              />
              <FeatureCard
                icon={Zap}
                title='시각적 비교'
                description='파형 기반의 시각적 비교를 통해 두 버전 간의 차이를 직관적으로 확인할 수 있습니다.'
              />
            </div>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* Version Management Section */}
      <FadeInWhenVisible>
        <section className='px-6 py-20'>
          <div className='mx-auto max-w-6xl'>
            <div className='mb-16 text-center'>
              <h2 className='mb-6 bg-gradient-to-r from-violet-400 to-white bg-clip-text text-4xl font-bold text-transparent'>
                Manage music history
              </h2>
            </div>

            <div className='space-y-20'>
              <div className='flex flex-col items-start gap-12 lg:flex-row'>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className='group flex-1'
                >
                  <div className='mb-6 flex items-start gap-4'>
                    <img
                      src={qItems[0].avatarUrl}
                      className='h-12 w-12 rounded-2xl border-2 border-slate-700 shadow-lg transition-colors group-hover:border-violet-500'
                    />
                    <div className='flex-1 rounded-3xl border border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm transition-all group-hover:border-violet-500/50'>
                      <p className='text-lg font-medium text-slate-100'>
                        {qItems[0].question}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className='flex flex-col items-start gap-12 lg:flex-row'>
                <div className='flex-1'></div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className='group flex-1'
                >
                  <div className='flex items-start justify-end gap-4'>
                    <div className='flex-1 rounded-3xl border border-violet-500/50 bg-gradient-to-r from-violet-900/50 to-purple-900/50 p-6 backdrop-blur-sm transition-all group-hover:border-violet-400'>
                      <p className='whitespace-pre-line text-base leading-relaxed text-violet-100'>
                        {aItems[0].answer}
                      </p>
                    </div>
                    <img
                      src={aItems[0].avatarUrl}
                      className='h-12 w-12 rounded-2xl border-2 border-violet-500 shadow-lg transition-colors group-hover:border-violet-400'
                    />
                  </div>
                </motion.div>
              </div>

              <div className='flex flex-col items-start gap-12 lg:flex-row'>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className='group flex-1'
                >
                  <div className='mb-6 flex items-start gap-4'>
                    <img
                      src={qItems[1].avatarUrl}
                      className='h-12 w-12 rounded-2xl border-2 border-slate-700 shadow-lg transition-colors group-hover:border-violet-500'
                    />
                    <div className='flex-1 rounded-3xl border border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm transition-all group-hover:border-violet-500/50'>
                      <p className='text-lg font-medium text-slate-100'>
                        {qItems[1].question}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className='flex flex-col items-start gap-12 lg:flex-row'>
                <div className='flex-1'></div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className='group flex-1'
                >
                  <div className='flex items-start justify-end gap-4'>
                    <div className='flex-1 rounded-3xl border border-violet-500/50 bg-gradient-to-r from-violet-900/50 to-purple-900/50 p-6 backdrop-blur-sm transition-all group-hover:border-violet-400'>
                      <p className='whitespace-pre-line text-base leading-relaxed text-violet-100'>
                        {aItems[1].answer}
                      </p>
                    </div>
                    <img
                      src={aItems[1].avatarUrl}
                      className='h-12 w-12 rounded-2xl border-2 border-violet-500 shadow-lg transition-colors group-hover:border-violet-400'
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* Transition Section */}
      <FadeInWhenVisible>
        <section className='px-6 py-32'>
          <div className='mx-auto max-w-4xl text-center'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className='relative rounded-3xl border border-violet-500/30 bg-gradient-to-r p-12 backdrop-blur-sm'
            >
              <div className='absolute inset-0 rounded-3xl bg-gradient-to-r' />
              <h2 className='relative z-10 mb-4 text-3xl font-bold text-white md:text-4xl'>
                이제는, 팀원들과 함께
                <br className='hidden md:block' />
                실시간으로 트랙을 관리하세요.
              </h2>
              <div className='absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 blur-xl' />
              <div className='absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 blur-xl' />
            </motion.div>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* Collaboration Section */}
      <FadeInWhenVisible>
        <section className='px-6 py-20'>
          <div className='mx-auto max-w-6xl'>
            <div className='mb-16 text-center'>
              <h2 className='mb-6 bg-gradient-to-r from-emerald-400 to-cyan-600 bg-clip-text text-4xl font-bold text-transparent'>
                Manage music collaboration
              </h2>
            </div>

            <div className='space-y-20'>
              {qItems.slice(3).map((qItem, index) => (
                <div key={index + 3} className='space-y-12'>
                  <div className='flex flex-col items-start gap-12 lg:flex-row'>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className='group flex-1'
                    >
                      <div className='flex items-start gap-4'>
                        <img
                          src={qItem.avatarUrl}
                          className='h-12 w-12 rounded-2xl border-2 border-slate-700 shadow-lg transition-colors group-hover:border-emerald-500'
                        />
                        <div className='flex-1 rounded-3xl border border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm transition-all group-hover:border-emerald-500/50'>
                          <p className='text-lg font-medium text-slate-100'>
                            {qItem.question}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className='flex flex-col items-start gap-12 lg:flex-row'>
                    <div className='flex-1'></div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className='group flex-1'
                    >
                      <div className='flex items-start justify-end gap-4'>
                        <div className='flex-1 rounded-3xl border border-emerald-500/50 bg-gradient-to-r from-emerald-900/50 to-cyan-900/50 p-6 backdrop-blur-sm transition-all group-hover:border-emerald-400'>
                          <p className='whitespace-pre-line text-base leading-relaxed text-emerald-100'>
                            {aItems[index + 3].answer}
                          </p>
                        </div>
                        <img
                          src={aItems[index + 3].avatarUrl}
                          className='h-12 w-12 rounded-2xl border-2 border-emerald-500 shadow-lg transition-colors group-hover:border-emerald-400'
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* Final Transition */}
      <FadeInWhenVisible>
        <section className='px-6 py-32'>
          <div className='mx-auto max-w-4xl text-center'>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className='relative rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 p-12 backdrop-blur-sm'
            >
              <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/5 to-cyan-500/5' />
              <h2 className='relative z-10 mb-4 text-3xl font-bold text-white md:text-4xl'>
                이제는 "최신 파일 뭐야?"
                <br className='hidden md:block' />
                묻지 않아도 됩니다
              </h2>
              <div className='absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-600/20 blur-xl' />
              <div className='absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 blur-xl' />
            </motion.div>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* CTA Section */}
      <FadeInWhenVisible>
        <section className='px-6 py-32'>
          <div className='mx-auto max-w-4xl text-center'>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className='relative rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-900/20 to-purple-900/20 p-16 backdrop-blur-sm'
            >
              <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500/5 to-purple-500/5' />
              <div className='relative z-10'>
                <h2 className='mb-6 text-4xl font-bold text-white md:text-5xl'>
                  Ready to Start Creating?
                </h2>
                <p className='mx-auto mb-10 max-w-2xl text-xl text-slate-300'>
                  수천 명의 뮤지션과 프로듀서들이 WavefloW와 함께 협업하고
                  있습니다. 지금 바로 시작해보세요.
                </p>
                <Link to='/signup'>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className='hover:shadow-3xl inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-10 py-4 text-lg font-semibold text-white shadow-2xl shadow-violet-500/25 transition-all hover:shadow-violet-500/40'
                  >
                    무료 체험 시작
                    <ArrowRight className='h-5 w-5 transition-transform group-hover:translate-x-1' />
                  </motion.button>
                </Link>
              </div>
              <div className='absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 blur-2xl' />
              <div className='absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 blur-2xl' />
            </motion.div>
          </div>
        </section>
      </FadeInWhenVisible>

      {/* Footer */}
      <footer className='relative border-t border-slate-800/50 px-6 py-16'>
        <div className='mx-auto max-w-6xl'>
          <div className='mb-12 grid grid-cols-1 gap-8 md:grid-cols-4'>
            <div className='md:col-span-2'>
              <div className='mb-4 flex items-center space-x-3'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-600'>
                  <Play className='h-4 w-4 text-white' />
                </div>
                <div className='bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-bold text-transparent'>
                  WavefloW
                </div>
              </div>
              <p className='mb-6 max-w-md text-slate-400'>
                음악 제작의 새로운 패러다임. 버전 관리와 실시간 협업을 통해 더
                나은 음악을 만들어보세요.
              </p>
              <div className='flex space-x-4'>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-slate-700'
                >
                  <div className='h-5 w-5 rounded-full bg-gradient-to-r from-violet-400 to-purple-600' />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-slate-700'
                >
                  <div className='h-5 w-5 rounded-full bg-gradient-to-r from-violet-400 to-purple-600' />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition-colors hover:bg-slate-700'
                >
                  <div className='h-5 w-5 rounded-full bg-gradient-to-r from-violet-400 to-purple-600' />
                </motion.button>
              </div>
            </div>

            <div>
              <h4 className='mb-4 font-semibold text-white'>Product</h4>
              <ul className='space-y-2 text-slate-400'>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    Features
                  </a>
                </li>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    Pricing
                  </a>
                </li>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    API
                  </a>
                </li>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className='mb-4 font-semibold text-white'>Company</h4>
              <ul className='space-y-2 text-slate-400'>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    About
                  </a>
                </li>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    Blog
                  </a>
                </li>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    Careers
                  </a>
                </li>
                <li>
                  <a href='#' className='transition-colors hover:text-white'>
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className='flex flex-col items-center justify-between border-t border-slate-800/50 pt-8 md:flex-row'>
            <p className='text-sm text-slate-500'>
              © {new Date().getFullYear()} WavefloW. All rights reserved.
            </p>
            <div className='mt-4 flex space-x-6 md:mt-0'>
              <a
                href='#'
                className='text-sm text-slate-500 transition-colors hover:text-white'
              >
                Privacy Policy
              </a>
              <a
                href='#'
                className='text-sm text-slate-500 transition-colors hover:text-white'
              >
                Terms of Service
              </a>
              <a
                href='#'
                className='text-sm text-slate-500 transition-colors hover:text-white'
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage2;
