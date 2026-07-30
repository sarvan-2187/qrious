import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const audiences = [
  {
    title: 'Students',
    desc: 'Build intuition before the exam.',
    cta: 'Start learning',
    href: '/login',
    bgClass: 'bg-indigo-900'
  },
  {
    title: 'Educators',
    desc: 'A live demo tool for the classroom, zero setup.',
    cta: 'View for educators',
    href: '/login',
    bgClass: 'bg-emerald-900'
  },
  {
    title: 'Curious beginners',
    desc: 'No linear algebra required to start.',
    cta: 'Try a demo circuit',
    href: '/login',
    bgClass: 'bg-purple-900'
  }
];

export default function AudienceBento() {
  return (
    <section className="bg-zinc-100 py-32 rounded-[1.5rem] md:rounded-[2.5rem] mt-8 px-6 md:px-16 w-full text-zinc-900">
      <div className="max-w-[1600px] mx-auto">
        <h2 className="text-3xl md:text-5xl font-sans tracking-tight text-center mb-16">
          Who is Qrious for?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((aud, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-[2rem] border border-zinc-200/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Top Image Area */}
              <div className={`h-16 w-full relative ${aud.bgClass}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 mix-blend-overlay" />
              </div>
              
              {/* Body */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-2xl font-sans mb-2 text-zinc-900">{aud.title}</h3>
                <p className="text-zinc-500 mb-8 flex-1">{aud.desc}</p>
                
                <Link to={aud.href} className="inline-flex items-center gap-2 text-emerald-600 font-medium group-hover:text-emerald-500 transition-colors w-fit">
                  {aud.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
