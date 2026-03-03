import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Atom, Leaf, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function ProjectileSimulation() {
  const [angle, setAngle] = useState([45]);
  const [velocity, setVelocity] = useState([50]);

  const a = (angle[0] * Math.PI) / 180;
  const v = velocity[0];
  const g = 9.8;
  const range = ((v * v * Math.sin(2 * a)) / g).toFixed(1);
  const maxH = ((v * v * Math.sin(a) * Math.sin(a)) / (2 * g)).toFixed(1);
  const time = ((2 * v * Math.sin(a)) / g).toFixed(2);

  // Generate trajectory points
  const points: string[] = [];
  const totalTime = (2 * v * Math.sin(a)) / g;
  for (let t = 0; t <= totalTime; t += totalTime / 40) {
    const x = v * Math.cos(a) * t;
    const y = v * Math.sin(a) * t - 0.5 * g * t * t;
    const px = 30 + (x / Math.max(parseFloat(range), 1)) * 260;
    const py = 180 - (y / Math.max(parseFloat(maxH), 1)) * 130;
    points.push(`${px},${py}`);
  }

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 rounded-lg p-4 relative overflow-hidden" style={{ height: 220 }}>
        <svg viewBox="0 0 320 200" className="w-full h-full">
          {/* Ground */}
          <line x1="20" y1="182" x2="300" y2="182" stroke="hsl(var(--border))" strokeWidth="2" />
          {/* Grid */}
          {[0, 1, 2, 3].map(i => (
            <line key={i} x1="30" y1={180 - i * 45} x2="295" y2={180 - i * 45} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" />
          ))}
          {/* Trajectory */}
          {points.length > 2 && (
            <motion.polyline
              points={points.join(" ")}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              key={`${angle}-${velocity}`}
            />
          )}
          {/* Launch angle arc */}
          <path
            d={`M 45 180 A 15 15 0 0 0 ${30 + 15 * Math.cos(a)} ${180 - 15 * Math.sin(a)}`}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="1.5"
          />
          <text x="52" y="175" fontSize="8" fill="hsl(var(--muted-foreground))">{angle[0]}°</text>
          {/* Projectile dot at peak */}
          <motion.circle
            cx={30 + 130}
            cy={180 - parseFloat(maxH) / Math.max(parseFloat(maxH), 1) * 130}
            r="4"
            fill="hsl(var(--accent))"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Launch Angle: <span className="font-semibold text-foreground">{angle[0]}°</span></p>
          <Slider value={angle} onValueChange={setAngle} min={5} max={85} step={1} />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Velocity: <span className="font-semibold text-foreground">{velocity[0]} m/s</span></p>
          <Slider value={velocity} onValueChange={setVelocity} min={10} max={100} step={1} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-md bg-primary-light text-center">
          <p className="text-lg font-bold text-primary">{range}m</p>
          <p className="text-[10px] text-muted-foreground">Range</p>
        </div>
        <div className="p-3 rounded-md bg-primary-light text-center">
          <p className="text-lg font-bold text-primary">{maxH}m</p>
          <p className="text-[10px] text-muted-foreground">Max Height</p>
        </div>
        <div className="p-3 rounded-md bg-primary-light text-center">
          <p className="text-lg font-bold text-primary">{time}s</p>
          <p className="text-[10px] text-muted-foreground">Flight Time</p>
        </div>
      </div>

      <div className="p-4 rounded-md bg-muted/50 border border-border/50">
        <h4 className="text-sm font-semibold text-foreground mb-1">📖 Explanation</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Projectile motion follows a parabolic path. The range is maximized at 45°. Increasing velocity increases both range and height quadratically (R = v²sin2θ/g).
        </p>
      </div>
    </div>
  );
}

function AcidBaseSimulation() {
  const [ph, setPh] = useState([7]);

  const phVal = ph[0];
  const isAcid = phVal < 7;
  const isBase = phVal > 7;
  const intensity = Math.abs(phVal - 7) / 7;

  const color = isAcid
    ? `hsl(0 ${60 + intensity * 40}% ${55 - intensity * 15}%)`
    : isBase
    ? `hsl(230 ${50 + intensity * 40}% ${55 - intensity * 10}%)`
    : `hsl(120 40% 55%)`;

  const label = phVal < 3 ? "Strong Acid" : phVal < 7 ? "Weak Acid" : phVal === 7 ? "Neutral" : phVal < 11 ? "Weak Base" : "Strong Base";

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center" style={{ height: 220 }}>
        <div className="relative">
          {/* Beaker */}
          <svg viewBox="0 0 140 180" className="w-40 h-52">
            <rect x="20" y="20" width="100" height="140" rx="8" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
            {/* Liquid */}
            <motion.rect
              x="22"
              y={160 - 120}
              width="96"
              height="120"
              rx="6"
              fill={color}
              animate={{ fillOpacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              key={phVal}
            />
            {/* Bubbles for extreme pH */}
            {intensity > 0.5 && Array.from({ length: Math.floor(intensity * 6) }).map((_, i) => (
              <motion.circle
                key={i}
                cx={40 + i * 15}
                cy={120}
                r={2 + Math.random() * 2}
                fill="hsl(var(--background))"
                fillOpacity={0.6}
                animate={{ cy: [120, 50 + i * 10], opacity: [0.6, 0] }}
                transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
            {/* pH scale markers */}
            {[0, 7, 14].map(mark => (
              <text key={mark} x={22 + (mark / 14) * 96} y="175" fontSize="8" textAnchor="middle" fill="hsl(var(--muted-foreground))">{mark}</text>
            ))}
            {/* pH indicator line */}
            <motion.line
              x1={22 + (phVal / 14) * 96}
              y1="158"
              x2={22 + (phVal / 14) * 96}
              y2="168"
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <motion.div
            className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg"
            style={{ backgroundColor: color, color: "white" }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            pH {phVal.toFixed(1)}
          </motion.div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">pH Level: <span className="font-semibold text-foreground">{phVal.toFixed(1)}</span></p>
        <Slider value={ph} onValueChange={setPh} min={0} max={14} step={0.1} />
      </div>

      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary" className="rounded-lg">{label}</Badge>
        <Badge variant="outline" className="rounded-lg">H⁺ = {Math.pow(10, -phVal).toExponential(1)} M</Badge>
      </div>

      <div className="p-4 rounded-md bg-muted/50 border border-border/50">
        <h4 className="text-sm font-semibold text-foreground mb-1">📖 Explanation</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          pH measures hydrogen ion concentration. pH 7 is neutral. Below 7 is acidic (more H⁺), above 7 is basic (more OH⁻). Each unit represents a 10× change in concentration.
        </p>
      </div>
    </div>
  );
}

function CellDivisionSimulation() {
  const [stage, setStage] = useState([0]);

  const stages = [
    { name: "Interphase", desc: "Cell grows and DNA replicates. Chromatin is loose and spread throughout the nucleus." },
    { name: "Prophase", desc: "Chromatin condenses into chromosomes. Spindle fibers begin forming." },
    { name: "Metaphase", desc: "Chromosomes align at the cell's equator (metaphase plate)." },
    { name: "Anaphase", desc: "Sister chromatids separate and move to opposite poles of the cell." },
    { name: "Telophase", desc: "Nuclear membranes reform. Chromosomes decondense. Cytokinesis begins." },
  ];

  const s = stage[0];
  const current = stages[Math.floor(s)];

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center" style={{ height: 220 }}>
        <motion.svg viewBox="0 0 200 160" className="w-64 h-44" key={Math.floor(s)}>
          {/* Cell membrane */}
          <motion.ellipse
            cx="100"
            cy="80"
            rx={s >= 4 ? 45 : 60}
            ry="55"
            fill="hsl(var(--primary-light))"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            animate={s >= 4 ? { rx: [60, 45] } : { rx: 60 }}
            transition={{ duration: 0.8 }}
          />
          {s >= 4 && (
            <motion.ellipse
              cx="155"
              cy="80"
              rx="45"
              ry="55"
              fill="hsl(var(--primary-light))"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
          {/* Nucleus */}
          {s < 1.5 && (
            <motion.circle
              cx="100"
              cy="80"
              r="25"
              fill="none"
              stroke="hsl(var(--primary-glow))"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              animate={{ opacity: s < 1 ? 1 : [1, 0] }}
              transition={{ duration: 0.5 }}
            />
          )}
          {/* Chromosomes */}
          {s >= 1 && s < 4 && (
            <>
              {[-15, -5, 5, 15].map((offset, i) => (
                <motion.line
                  key={i}
                  x1={s >= 3 ? 100 + offset : 100 + offset}
                  y1={s >= 2 ? 80 : 65 + i * 8}
                  x2={s >= 3 ? (i < 2 ? 60 : 140) + offset : 100 + offset}
                  y2={s >= 2 ? 80 : 70 + i * 8}
                  stroke="hsl(var(--accent))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  animate={s >= 3 ? {
                    x2: i < 2 ? 60 + offset : 140 + offset,
                  } : {}}
                  transition={{ duration: 0.8 }}
                />
              ))}
            </>
          )}
          {/* Spindle fibers */}
          {s >= 1.5 && s < 4.5 && (
            <>
              <line x1="30" y1="80" x2="170" y2="80" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="3 3" />
              <circle cx="30" cy="80" r="4" fill="hsl(var(--chart-4))" />
              <circle cx="170" cy="80" r="4" fill="hsl(var(--chart-4))" />
            </>
          )}
          {/* DNA strands in interphase */}
          {s < 1 && (
            <motion.path
              d="M85 70 Q90 65 95 70 Q100 75 105 70 Q110 65 115 70"
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth="2"
              animate={{ d: ["M85 70 Q90 65 95 70 Q100 75 105 70 Q110 65 115 70", "M85 75 Q90 70 95 75 Q100 80 105 75 Q110 70 115 75", "M85 70 Q90 65 95 70 Q100 75 105 70 Q110 65 115 70"] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
        </motion.svg>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Stage</p>
          <Badge variant="secondary" className="rounded-lg text-xs">{current.name}</Badge>
        </div>
        <Slider value={stage} onValueChange={setStage} min={0} max={4} step={0.01} />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          {stages.map(s => <span key={s.name}>{s.name.slice(0, 3)}</span>)}
        </div>
      </div>

      <div className="p-4 rounded-md bg-muted/50 border border-border/50">
        <h4 className="text-sm font-semibold text-foreground mb-1">📖 {current.name}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{current.desc}</p>
      </div>
    </div>
  );
}

export default function Experiments() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="w-7 h-7 text-primary" /> Science Experiment Explorer
        </h1>
        <p className="text-muted-foreground text-sm">Interactive simulations across Physics, Chemistry & Biology.</p>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="physics" className="w-full">
          <TabsList className="bg-muted/50 rounded-md p-1 mb-6">
            <TabsTrigger value="physics" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
              <Atom className="w-4 h-4" /> Physics
            </TabsTrigger>
            <TabsTrigger value="chemistry" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
              <FlaskConical className="w-4 h-4" /> Chemistry
            </TabsTrigger>
            <TabsTrigger value="biology" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2">
              <Leaf className="w-4 h-4" /> Biology
            </TabsTrigger>
          </TabsList>

          <TabsContent value="physics">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" /> Projectile Motion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectileSimulation />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chemistry">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-primary" /> Acid-Base pH Scale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AcidBaseSimulation />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="biology">
            <Card className="rounded-lg shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-chart-2" /> Cell Division (Mitosis)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CellDivisionSimulation />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
