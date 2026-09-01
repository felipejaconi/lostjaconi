import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

# Add states for pin unlocking
state_hooks = """  const [orders, setOrders] = useState<any[]>([]);
  const [stockLoja, setStockLoja] = useState<any[]>([]);
  const [fechos, setFechos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Lock logic
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [expectedPin, setExpectedPin] = useState("0000");
  const [pinError, setPinError] = useState(false);"""

content = content.replace(
"""  const [orders, setOrders] = useState<any[]>([]);
  const [stockLoja, setStockLoja] = useState<any[]>([]);
  const [fechos, setFechos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);""",
state_hooks
)

use_effect_pin = """  useEffect(() => {
    if (!user) return;
    
    // Fetch the PIN for the current store
    supabase.from('users').select('manager_pin').eq('id', user.id).single().then(({ data }) => {
       if (data && data.manager_pin) {
           setExpectedPin(data.manager_pin);
       }
    });"""

content = content.replace(
"""  useEffect(() => {
    if (!user) return;""",
use_effect_pin
)

lock_screen = """  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === expectedPin) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] h-full w-full p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-white/5 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500/50"></div>
          <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mx-auto mb-6">
            <Target size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Área Restrita</h2>
          <p className="text-slate-400 text-center text-sm mb-8">Introduza o PIN de gerência para aceder a esta página.</p>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="space-y-2">
              <input 
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="****"
                maxLength={8}
                className={cn(
                  "w-full bg-black/50 border rounded-xl py-4 text-center text-2xl tracking-[0.5em] font-mono text-white outline-none transition-all",
                  pinError ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" : "border-white/10 focus:border-yellow-500"
                )}
              />
              {pinError && <p className="text-red-500 text-xs text-center font-medium mt-2">PIN incorreto. Tente novamente.</p>}
            </div>
            
            <button 
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold py-3 rounded-xl transition-all"
            >
              Entrar
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
"""

content = content.replace(
"""  return (
    <ContentViewport>""",
lock_screen + """    <ContentViewport>"""
)

with open('src/pages/store/StoreManagement.tsx', 'w') as f:
    f.write(content)
