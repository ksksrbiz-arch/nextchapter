import Image from 'next/image';
import { motion } from 'motion/react';

const MOCK_UGC = [
  {
    id: 1,
    name: "Sarah M.",
    location: "Santorini, Greece",
    quote: "Watching the sunset here truly felt like turning the page to a beautiful new chapter.",
    package: "Aegean Escape",
    img: "https://picsum.photos/seed/santorini/600/800"
  },
  {
    id: 2,
    name: "James & Emma",
    location: "Kyoto, Japan",
    quote: "Our honeymoon was flawlessly planned. The perfect start to our story together.",
    package: "Cherry Blossom Romance",
    img: "https://picsum.photos/seed/kyoto/800/600"
  },
  {
    id: 3,
    name: "The Rodriguez Family",
    location: "Tuscan Countryside",
    quote: "Next Chapter took the stress out of family travel. A core memory unlocked.",
    package: "Villa Retreat",
    img: "https://picsum.photos/seed/tuscany/600/600"
  },
  {
    id: 4,
    name: "David K.",
    location: "Swiss Alps",
    quote: "The itinerary was a perfect balance of adventure and pause.",
    package: "Alpine Peaks",
    img: "https://picsum.photos/seed/alps/800/800"
  }
];

export default function HallOfFameTab() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl mb-2 text-slate-800">Next Chapter Hall of Fame</h2>
          <p className="text-slate-500">Curated showcase of real travelers experiencing their next chapter.</p>
        </div>
        <button className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-slate-800 transition shadow-md">
          Upload Client Photo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_UGC.map((item, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            key={item.id} 
            className="group relative rounded-3xl overflow-hidden aspect-[4/5] bg-slate-100 shadow-sm border border-slate-200"
          >
            <Image 
              src={item.img} 
              alt={item.location}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            
            {/* Cinematic Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent" />
            
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white opacity-90 group-hover:opacity-100 transition-opacity duration-500">
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
                className="text-amber-400 font-medium text-sm mb-2 drop-shadow-md"
              >
                {item.location}
              </motion.span>
              <p className="font-serif text-xl italic mb-4 leading-snug drop-shadow-lg">&quot;{item.quote}&quot;</p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/20">
                <span className="text-sm text-slate-100 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs text-white font-bold shadow-md">
                    {item.name[0]}
                  </span>
                  {item.name}
                </span>
                
                <button className="bg-white/10 hover:bg-amber-500 hover:text-white hover:border-amber-500 backdrop-blur-md border border-white/30 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 shadow-sm">
                  Booked: {item.package}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
