import { useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Brain, Heart, Activity, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function BrainAnimation({ activity }: { activity: number }) {
  const pulseScale = 1 + activity * 0.004;
  const glowOpacity = 0.2 + activity * 0.008;
  const synapseCount = Math.floor(activity / 15);

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, hsl(var(--primary) / ${glowOpacity}), transparent 70%)` }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2 / (0.5 + activity * 0.01), repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Brain SVG */}
      <motion.svg
        viewBox="0 0 120 120"
        className="w-full h-full relative z-10"
        animate={{ scale: [1, pulseScale, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Left hemisphere */}
        <motion.path
          d="M60 20 C35 20 20 40 20 60 C20 85 35 100 60 100"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ pathLength: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {/* Right hemisphere */}
        <motion.path
          d="M60 20 C85 20 100 40 100 60 C100 85 85 100 60 100"
          fill="none"
          stroke="hsl(var(--primary-glow))"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{ pathLength: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        {/* Center line */}
        <motion.line x1="60" y1="22" x2="60" y2="98" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 4" />
        {/* Folds left */}
        <motion.path d="M35 40 Q45 35 55 42" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <motion.path d="M30 55 Q42 48 55 55" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }} />
        <motion.path d="M32 70 Q44 63 55 70" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }} />
        {/* Folds right */}
        <motion.path d="M65 42 Q75 35 85 40" fill="none" stroke="hsl(var(--primary-glow))" strokeWidth="1.5" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }} />
        <motion.path d="M65 55 Q78 48 90 55" fill="none" stroke="hsl(var(--primary-glow))" strokeWidth="1.5" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }} />
        <motion.path d="M65 70 Q76 63 88 70" fill="none" stroke="hsl(var(--primary-glow))" strokeWidth="1.5" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.5 }} />
        {/* Synapses */}
        {Array.from({ length: synapseCount }).map((_, i) => {
          const angle = (i * 360) / synapseCount;
          const r = 28 + (i % 3) * 8;
          const cx = 60 + r * Math.cos((angle * Math.PI) / 180);
          const cy = 60 + r * Math.sin((angle * Math.PI) / 180);
          return (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r="2"
              fill="hsl(var(--accent))"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          );
        })}
      </motion.svg>
      {/* Label */}
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-primary bg-primary-light px-3 py-1 rounded-full"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {activity}% Active
      </motion.div>
    </div>
  );
}

function HeartAnimation({ motivation }: { motivation: number }) {
  const bpm = 40 + motivation * 0.8;
  const duration = 60 / bpm;
  const fillColor = motivation > 70 ? "var(--destructive)" : motivation > 40 ? "var(--accent)" : "var(--muted-foreground)";

  return (
    <div className="relative w-48 h-48 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, hsl(0 72% 51% / ${motivation * 0.005}), transparent 70%)` }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg
        viewBox="0 0 120 120"
        className="w-full h-full relative z-10"
        animate={{ scale: [1, 1.12, 1, 1.08, 1] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.path
          d="M60 95 C20 65 10 40 30 25 C45 15 55 25 60 35 C65 25 75 15 90 25 C110 40 100 65 60 95Z"
          fill={`hsl(${fillColor})`}
          stroke={`hsl(${fillColor})`}
          strokeWidth="2"
          animate={{ fillOpacity: [0.7, 1, 0.7] }}
          transition={{ duration, repeat: Infinity }}
        />
        {/* Pulse lines */}
        {motivation > 30 && (
          <motion.polyline
            points="15,60 30,60 38,45 46,75 54,50 62,70 70,55 78,60 105,60"
            fill="none"
            stroke="hsl(var(--background))"
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ pathLength: [0, 1], opacity: [1, 0] }}
            transition={{ duration: duration * 1.5, repeat: Infinity }}
          />
        )}
      </motion.svg>
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full"
        style={{ color: `hsl(${fillColor})`, backgroundColor: `hsl(${fillColor} / 0.1)` }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {motivation}% Motivated
      </motion.div>
    </div>
  );
}

function BodyAnimation({ focus }: { focus: number }) {
  const auraOpacity = focus * 0.008;
  const headGlow = focus > 60;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, hsl(var(--chart-4) / ${auraOpacity}), transparent 70%)` }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.svg viewBox="0 0 120 140" className="w-full h-full relative z-10">
        {/* Head */}
        <motion.circle
          cx="60"
          cy="30"
          r="16"
          fill={headGlow ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
          animate={{ fillOpacity: headGlow ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {headGlow && (
          <motion.circle
            cx="60"
            cy="30"
            r="22"
            fill="none"
            stroke="hsl(var(--primary-glow))"
            strokeWidth="1"
            animate={{ r: [20, 26, 20], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {/* Body */}
        <motion.line x1="60" y1="46" x2="60" y2="85" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" />
        {/* Arms */}
        <motion.line
          x1="60" y1="58" x2="35" y2="72"
          stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round"
          animate={focus > 50 ? { x2: [35, 30, 35], y2: [72, 65, 72] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.line
          x1="60" y1="58" x2="85" y2="72"
          stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round"
          animate={focus > 50 ? { x2: [85, 90, 85], y2: [72, 65, 72] } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        {/* Legs */}
        <motion.line x1="60" y1="85" x2="42" y2="115" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
        <motion.line x1="60" y1="85" x2="78" y2="115" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
        {/* Focus aura rings */}
        {focus > 40 && Array.from({ length: Math.floor(focus / 25) }).map((_, i) => (
          <motion.circle
            key={i}
            cx="60"
            cy="65"
            r={40 + i * 12}
            fill="none"
            stroke="hsl(var(--chart-4))"
            strokeWidth="0.5"
            animate={{ opacity: [0.3, 0.1, 0.3], r: [40 + i * 12, 44 + i * 12, 40 + i * 12] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </motion.svg>
      <motion.div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-chart-4 bg-chart-4/10 px-3 py-1 rounded-full"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {focus}% Focused
      </motion.div>
    </div>
  );
}

export default function Animations() {
  const [brainActivity, setBrainActivity] = useState([65]);
  const [heartMotivation, setHeartMotivation] = useState([50]);
  const [bodyFocus, setBodyFocus] = useState([40]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" /> Educational Animations
        </h1>
        <p className="text-muted-foreground text-sm">Interact with animated learning indicators. Adjust sliders to see real-time changes.</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Brain */}
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Memory Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <BrainAnimation activity={brainActivity[0]} />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Activity Level</p>
              <Slider value={brainActivity} onValueChange={setBrainActivity} max={100} step={1} className="w-full" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Neural synapses fire more rapidly as memory activity increases. Higher activity shows more connections forming in the brain.
            </p>
          </CardContent>
        </Card>

        {/* Heart */}
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5 text-destructive" /> Motivation Meter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <HeartAnimation motivation={heartMotivation[0]} />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Motivation Level</p>
              <Slider value={heartMotivation} onValueChange={setHeartMotivation} max={100} step={1} className="w-full" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The heart beats faster with higher motivation. Color shifts from cool to warm as engagement rises.
            </p>
          </CardContent>
        </Card>

        {/* Body */}
        <Card className="rounded-lg shadow-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-chart-4" /> Focus Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <BodyAnimation focus={bodyFocus[0]} />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Focus Level</p>
              <Slider value={bodyFocus} onValueChange={setBodyFocus} max={100} step={1} className="w-full" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Focus creates a visible aura. At high levels, the head glows and energy radiates outward from the body.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
