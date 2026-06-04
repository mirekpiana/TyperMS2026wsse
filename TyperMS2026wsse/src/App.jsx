import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';


const firebaseConfig = {
apiKey: "AIzaSyDqbXxJJyWJsCU-jlqYz62Hhz5_K5ZXCI0",
authDomain: "typerms2026wsse.firebaseapp.com",
projectId: "typerms2026wsse",
storageBucket: "typerms2026wsse.firebasestorage.app",
messagingSenderId: "584802707705",
appId: "1:584802707705:web:e85291e8c8998c8b351a28",
};

const GROUPS = {
  A: ['Meksyk', 'RPA', 'Korea Płd.', 'Czechy'],
  B: ['Kanada', 'Bośnia i Herc.', 'Katar', 'Szwajcaria'],
  C: ['Brazylia', 'Maroko', 'Haiti', 'Szkocja'],
  D: ['USA', 'Paragwaj', 'Australia', 'Turcja'],
  E: ['Niemcy', 'Curacao', 'WKS', 'Ekwador'],
  F: ['Holandia', 'Japonia', 'Szwecja', 'Tunezja'],
  G: ['Belgia', 'Egipt', 'Iran', 'Nowa Zelandia'],
  H: ['Hiszpania', 'RWP', 'Arabia Saud.', 'Urugwaj'],
  I: ['Francja', 'Senegal', 'Irak', 'Norwegia'],
  J: ['Argentyna', 'Algieria', 'Austria', 'Jordania'],
  K: ['Portugalia', 'DR Konga', 'Uzbekistan', 'Kolumbia'],
  L: ['Anglia', 'Chorwacja', 'Ghana', 'Panama']
};

export default function App() {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState({});
    const [results, setResults] = useState({});
    const [predictions, setPredictions] = useState({});
    const [activeTab, setActiveTab] = useState('typowanie');
    const [db, setDb] = useState(null);

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestore = getFirestore(app);
        setDb(firestore);

        signInAnonymously(auth).catch(err => console.error("Błąd auth:", err));
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !db) return;

        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
            const data = {}; snap.forEach(d => data[d.id] = { id: d.id, ...d.data() }); setUsers(data);
        });

        const unsubResults = onSnapshot(collection(db, 'results'), snap => {
            const data = {}; snap.forEach(d => data[d.id] = d.data()); setResults(data);
        });

        const unsubPreds = onSnapshot(collection(db, 'predictions'), snap => {
            const data = {}; snap.forEach(d => data[d.id] = d.data()); setPredictions(data);
        });

        return () => { unsubUsers(); unsubResults(); unsubPreds(); };
    }, [user, db]);

    const groupMatches = useMemo(() => {
        let m = [];
        Object.keys(GROUPS).forEach(g => {
            const t = GROUPS[g];
            m.push({ id: `${g}1`, group: g, t1: t[0], t2: t[1] });
            m.push({ id: `${g}2`, group: g, t1: t[2], t2: t[3] });
            m.push({ id: `${g}3`, group: g, t1: t[0], t2: t[2] });
            m.push({ id: `${g}4`, group: g, t1: t[1], t2: t[3] });
            m.push({ id: `${g}5`, group: g, t1: t[3], t2: t[0] });
            m.push({ id: `${g}6`, group: g, t1: t[1], t2: t[2] });
        });
        return m;
    }, []);

    const groupStandings = useMemo(() => {
        const standings = {};
        Object.keys(GROUPS).forEach(g => {
            let teams = GROUPS[g].map(t => ({ team: t, pts: 0, gd: 0, gf: 0, ga: 0, matches: 0 }));
            groupMatches.filter(m => m.group === g).forEach(m => {
                const res = results[m.id];
                if (res && res.score1 !== undefined && res.score2 !== undefined) {
                    const t1 = teams.find(t => t.team === m.t1);
                    const t2 = teams.find(t => t.team === m.t2);
                    t1.matches++; t2.matches++;
                    t1.gf += res.score1; t1.ga += res.score2; t1.gd = t1.gf - t1.ga;
                    t2.gf += res.score2; t2.ga += res.score1; t2.gd = t2.gf - t2.ga;
                    if (res.score1 > res.score2) t1.pts += 3;
                    else if (res.score1 < res.score2) t2.pts += 3;
                    else { t1.pts += 1; t2.pts += 1; }
                }
            });
            teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
            standings[g] = teams;
        });
        return standings;
    }, [groupMatches, results]);

    const bracketMatches = useMemo(() => {
        let allMatchesDone = groupMatches.every(m => results[m.id] !== undefined);
        let seeds = [];
        
        if (allMatchesDone) {
            let firsts = [], seconds = [], thirds = [];
            Object.values(groupStandings).forEach(teams => {
                firsts.push(teams[0]); seconds.push(teams[1]); thirds.push(teams[2]);
            });
            const sortFn = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team);
            firsts.sort(sortFn); seconds.sort(sortFn); thirds.sort(sortFn);
            seeds = [ ...firsts.map(t => t.team), ...seconds.map(t => t.team), ...thirds.slice(0, 8).map(t => t.team) ];
        }

        const bracket = {};
        const matchPairs = [
          [1, 32], [16, 17], [9, 24], [8, 25], [4, 29], [13, 20], [12, 21], [5, 28],
          [2, 31], [15, 18], [10, 23], [7, 26], [3, 30], [14, 19], [11, 22], [6, 27]
        ];

        for(let i=1; i<=31; i++) {
           if (i <= 16) {
               bracket[`K${i}`] = {
                   id: `K${i}`, stage: '1/16 Finału',
                   t1: seeds.length ? seeds[matchPairs[i-1][0]-1] : `Zwycięzca #${matchPairs[i-1][0]}`,
                   t2: seeds.length ? seeds[matchPairs[i-1][1]-1] : `Awansujący #${matchPairs[i-1][1]}`,
                   next: `K${17 + Math.floor((i-1)/2)}`
               };
           } else if (i <= 24) {
               bracket[`K${i}`] = { id: `K${i}`, stage: '1/8 Finału', t1: '?', t2: '?', next: `K${25 + Math.floor((i-17)/2)}` };
           } else if (i <= 28) {
               bracket[`K${i}`] = { id: `K${i}`, stage: '1/4 Finału', t1: '?', t2: '?', next: `K${29 + Math.floor((i-25)/2)}` };
           } else if (i <= 30) {
               bracket[`K${i}`] = { id: `K${i}`, stage: 'Półfinał', t1: '?', t2: '?', next: `K31` };
           } else if (i === 31) {
               bracket[`K${i}`] = { id: `K${i}`, stage: 'Finał', t1: '?', t2: '?', next: null };
           }
        }

        for (let i=1; i<=31; i++) {
            const m = bracket[`K${i}`];
            const res = results[`K${i}`];
            if (res && m.next) {
                let winner = null;
                if (res.score1 > res.score2) winner = m.t1;
                else if (res.score2 > res.score1) winner = m.t2;
                else if (res.penaltyWinner === 1) winner = m.t1;
                else if (res.penaltyWinner === 2) winner = m.t2;

                if (winner) {
                    const nextM = bracket[m.next];
                    const isFirstSlot = (i % 2) !== 0; 
                    if (isFirstSlot) nextM.t1 = winner; else nextM.t2 = winner;
                }
            }
        }
        return bracket;
    }, [groupStandings, results, groupMatches]);

    const rankingData = useMemo(() => {
        return Object.values(users).map(u => {
            let pts = 0; let perfect = 0;
            Object.values(predictions).filter(p => p.userId === u.id).forEach(p => {
                const res = results[p.matchId];
                if (res && res.score1 !== undefined) {
                    if (p.score1 === res.score1 && p.score2 === res.score2) { pts += 3; perfect++; }
                    else if (Math.sign(p.score1 - p.score2) === Math.sign(res.score1 - res.score2)) { pts += 1; }
                }
            });
            return { ...u, points: pts, perfect };
        }).sort((a, b) => b.points - a.points || b.perfect - a.perfect || a.name.localeCompare(b.name));
    }, [users, predictions, results]);

    const handleSaveProfile = async (name) => {
        if(!db || !user) return;
        await setDoc(doc(db, 'users', user.uid), { name, joinedAt: new Date().toISOString() });
    };

    const handleSavePred = async (matchId, s1, s2) => {
        if (!user || !db) return;
        const docId = `${user.uid}_${matchId}`;
        await setDoc(doc(db, 'predictions', docId), {
            userId: user.uid, matchId, score1: parseInt(s1), score2: parseInt(s2), updatedAt: new Date().toISOString()
        });
    };

    const handleSaveResult = async (matchId, s1, s2, pw = 0) => {
        if(!db) return;
        await setDoc(doc(db, 'results', matchId), {
            matchId, score1: parseInt(s1), score2: parseInt(s2), penaltyWinner: pw
        });
    };

    const currentUserProfile = user ? users[user.uid] : null;

    if (!user) return <div className="p-8 text-center text-white min-h-screen bg-slate-900 flex items-center justify-center">Inicjalizacja systemu obstawiania...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-24 font-sans">
            {!currentUserProfile && <ProfileSetup onSave={handleSaveProfile} />}

            <header className="bg-slate-800 p-4 sticky top-0 z-10 shadow-lg border-b border-slate-700">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <h1 className="text-xl font-extrabold text-white tracking-wider">🏆 TYPER MŚ 2026</h1>
                    {currentUserProfile && <div className="text-sm bg-blue-600 px-3 py-1 rounded-full">{currentUserProfile.name}</div>}
                </div>
            </header>

            <main className="max-w-4xl mx-auto mt-6 px-4">
                {activeTab === 'typowanie' && <TypowanieView groupMatches={groupMatches} bracketMatches={bracketMatches} results={results} predictions={predictions} currentUser={user} onSavePred={handleSavePred} />}
                {activeTab === 'grupy' && <GrupyView standings={groupStandings} />}
                {activeTab === 'drabinka' && <DrabinkaView bracket={bracketMatches} results={results} />}
                {activeTab === 'ranking' && <RankingView ranking={rankingData} />}
                {activeTab === 'admin' && <AdminPanel groupMatches={groupMatches} bracketMatches={bracketMatches} results={results} onSaveResult={handleSaveResult} />}
            </main>

            <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 shadow-xl z-20">
                <div className="flex justify-around max-w-4xl mx-auto py-2">
                    <button onClick={()=>setActiveTab('typowanie')} className={`p-2 flex flex-col items-center text-xs transition-colors ${activeTab==='typowanie'?'text-blue-400':'text-slate-400 hover:text-slate-200'}`}><span className="text-xl mb-1">⚽</span>Typy</button>
                    <button onClick={()=>setActiveTab('grupy')} className={`p-2 flex flex-col items-center text-xs transition-colors ${activeTab==='grupy'?'text-blue-400':'text-slate-400 hover:text-slate-200'}`}><span className="text-xl mb-1">📊</span>Tabele</button>
                    <button onClick={()=>setActiveTab('drabinka')} className={`p-2 flex flex-col items-center text-xs transition-colors ${activeTab==='drabinka'?'text-blue-400':'text-slate-400 hover:text-slate-200'}`}><span className="text-xl mb-1">🌿</span>Drabinka</button>
                    <button onClick={()=>setActiveTab('ranking')} className={`p-2 flex flex-col items-center text-xs transition-colors ${activeTab==='ranking'?'text-blue-400':'text-slate-400 hover:text-slate-200'}`}><span className="text-xl mb-1">🥇</span>Ranking</button>
                    <button onClick={()=>setActiveTab('admin')} className={`p-2 flex flex-col items-center text-xs transition-colors ${activeTab==='admin'?'text-blue-400':'text-slate-400 hover:text-slate-200'}`}><span className="text-xl mb-1">⚙️</span>Admin</button>
                </div>
            </nav>
        </div>
    )
}

const ProfileSetup = ({ onSave }) => {
    const [name, setName] = useState('');
    return (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 p-6 rounded-xl max-w-sm w-full border border-slate-700 text-center shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Podaj swój Nick</h2>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa gracza..." className="w-full p-3 mb-4 bg-slate-900 border border-slate-600 rounded-lg text-center text-white focus:outline-none focus:border-blue-500 transition-colors" />
                <button onClick={() => name.trim() && onSave(name.trim())} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold transition-colors">Wejdź do gry</button>
            </div>
        </div>
    )
}

const MatchCard = ({ m, result, prediction, onSavePred, isAdmin, onSaveResult }) => {
    const [s1, setS1] = useState(isAdmin ? result?.score1 ?? '' : prediction?.score1 ?? '');
    const [s2, setS2] = useState(isAdmin ? result?.score2 ?? '' : prediction?.score2 ?? '');
    const [pw, setPw] = useState(result?.penaltyWinner ?? 0);

    useEffect(() => {
       if (isAdmin) { setS1(result?.score1 ?? ''); setS2(result?.score2 ?? ''); setPw(result?.penaltyWinner ?? 0); }
       else { setS1(prediction?.score1 ?? ''); setS2(prediction?.score2 ?? ''); }
    }, [result, prediction, isAdmin]);

    const handleBlur = () => {
        if (s1 !== '' && s2 !== '') {
            if (isAdmin) onSaveResult(m.id, s1, s2, pw);
            else onSavePred(m.id, s1, s2);
        }
    };

    const isLocked = !isAdmin && result !== undefined;

    return (
        <div className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700/50 shadow-sm flex flex-col">
            <div className="text-[10px] tracking-widest text-slate-400 font-bold mb-3 uppercase flex justify-between">
                <span>{m.group ? `Grupa ${m.group}` : m.stage}</span>
                {isLocked && <span className="text-green-400">✅ Wynik wprowadzony</span>}
            </div>
            <div className="flex items-center justify-between">
                <div className="w-1/3 text-right font-medium pr-3 truncate text-slate-200">{m.t1}</div>
                <div className="flex items-center gap-2">
                    <input type="number" min="0" value={s1} onChange={e=>setS1(e.target.value)} onBlur={handleBlur} disabled={isLocked} className="w-12 h-10 bg-slate-900 border border-slate-600 rounded-lg text-center text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50" placeholder="-" />
                    <span className="text-slate-500 font-bold">:</span>
                    <input type="number" min="0" value={s2} onChange={e=>setS2(e.target.value)} onBlur={handleBlur} disabled={isLocked} className="w-12 h-10 bg-slate-900 border border-slate-600 rounded-lg text-center text-white font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50" placeholder="-" />
                </div>
                <div className="w-1/3 text-left font-medium pl-3 truncate text-slate-200">{m.t2}</div>
            </div>
            {isAdmin && m.id.startsWith('K') && s1 !== '' && s2 !== '' && parseInt(s1) === parseInt(s2) && (
                <div className="mt-4 text-center border-t border-slate-700 pt-3">
                    <select value={pw} onChange={e=>{setPw(parseInt(e.target.value)); onSaveResult(m.id, s1, s2, parseInt(e.target.value));}} className="bg-slate-900 text-xs p-2 border border-slate-600 rounded-lg text-white focus:outline-none w-full">
                        <option value={0}>Remis - wybierz kto wygrał karne</option>
                        <option value={1}>{m.t1}</option>
                        <option value={2}>{m.t2}</option>
                    </select>
                </div>
            )}
            {!isAdmin && result && m.id.startsWith('K') && result.score1 === result.score2 && result.penaltyWinner > 0 && (
                 <div className="mt-3 text-center text-xs text-slate-400 border-t border-slate-700 pt-2">
                     Awansuje: <span className="font-bold text-white">{result.penaltyWinner === 1 ? m.t1 : m.t2}</span>
                 </div>
            )}
        </div>
    );
}

const TypowanieView = ({ groupMatches, bracketMatches, results, predictions, currentUser, onSavePred }) => (
    <div className="pb-6">
        <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Faza Grupowa</h3>
        {groupMatches.map(m => <MatchCard key={m.id} m={m} result={results[m.id]} prediction={predictions[`${currentUser.uid}_${m.id}`]} onSavePred={onSavePred} isAdmin={false} />)}
        
        <h3 className="text-xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">Faza Pucharowa</h3>
        {Object.values(bracketMatches).map(m => <MatchCard key={m.id} m={m} result={results[m.id]} prediction={predictions[`${currentUser.uid}_${m.id}`]} onSavePred={onSavePred} isAdmin={false} />)}
    </div>
)

const GrupyView = ({ standings }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
        {Object.keys(standings).map(g => (
            <div key={g} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="font-bold bg-slate-900/50 border-b border-slate-700 p-3 text-center text-white">Grupa {g}</div>
                <div className="text-[10px] font-bold text-slate-500 grid grid-cols-4 px-3 py-2 bg-slate-900/30 uppercase tracking-wider">
                    <span>Zespół</span><span className="text-center">M</span><span className="text-center">Br</span><span className="text-right">Pkt</span>
                </div>
                {standings[g].map((t, i) => (
                    <div key={t.team} className={`grid grid-cols-4 px-3 py-3 border-t border-slate-700/50 text-sm ${i < 2 ? 'bg-green-900/10' : ''} ${i === 2 ? 'bg-blue-900/10' : ''}`}>
                        <span className="font-medium flex items-center gap-2"><span className="text-slate-500 text-xs w-3">{i+1}.</span> {t.team}</span>
                        <span className="text-center">{t.matches}</span>
                        <span className="text-center text-slate-400">{t.gf}:{t.ga}</span>
                        <span className="text-right font-black text-blue-400">{t.pts}</span>
                    </div>
                ))}
            </div>
        ))}
    </div>
)

const DrabinkaView = ({ bracket, results }) => {
    const stages = ['1/16 Finału', '1/8 Finału', '1/4 Finału', 'Półfinał', 'Finał'];
    const matches = Object.values(bracket);

    return (
        <div className="space-y-6 pb-6">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-sm text-slate-300 text-center">
                Drabinka generuje się z koszyków automatycznie po zakończeniu fazy grupowej.
            </div>
            {stages.map(stage => {
                const stageMatches = matches.filter(m => m.stage === stage);
                return (
                    <div key={stage}>
                        <h3 className="text-lg font-bold text-blue-400 mb-3 sticky top-16 bg-slate-900 py-2 z-10">{stage}</h3>
                        <div className="space-y-3">
                            {stageMatches.map(m => {
                                const res = results[m.id];
                                return (
                                    <div key={m.id} className="flex bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                                        <div className="bg-slate-900 w-10 flex items-center justify-center text-xs font-bold text-slate-600 border-r border-slate-700">{m.id}</div>
                                        <div className="flex-1 p-3">
                                            <div className="flex justify-between mb-2">
                                                <span className={`font-medium ${res && res.score1 > res.score2 ? 'text-green-400' : 'text-slate-200'}`}>{m.t1}</span>
                                                <span className="font-bold bg-slate-900 px-2 rounded text-white">{res ? res.score1 : '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className={`font-medium ${res && res.score2 > res.score1 ? 'text-green-400' : 'text-slate-200'}`}>{m.t2}</span>
                                                <span className="font-bold bg-slate-900 px-2 rounded text-white">{res ? res.score2 : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

const RankingView = ({ ranking }) => (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6 shadow-lg">
        <div className="p-4 bg-slate-900/80 border-b border-slate-700">
            <h2 className="font-bold text-white text-lg">Tabela Wyników</h2>
            <p className="text-xs text-slate-400 mt-1">1 pkt za poprawny kierunek, 3 pkt za idealny wynik.</p>
        </div>
        {ranking.map((u, i) => (
            <div key={u.id} className="p-4 border-b border-slate-700/50 last:border-0 flex justify-between items-center hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-3">
                    <span className="font-black text-slate-500 w-4 text-center">{i+1}</span>
                    <span className="font-bold text-white text-base">{u.name} {i === 0 && '👑'}</span>
                </div>
                <div className="text-right">
                    <div className="font-black text-blue-400 text-lg leading-none">{u.points}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold mt-1">Perfekcyjnie: {u.perfect}</div>
                </div>
            </div>
        ))}
        {ranking.length === 0 && <div className="p-8 text-center text-slate-500">Brak graczy w rankingu. Udostępnij link!</div>}
    </div>
)

const AdminPanel = ({ groupMatches, bracketMatches, results, onSaveResult }) => {
    const [pin, setPin] = useState('');
    const [isAuthed, setIsAuthed] = useState(false);
    const [error, setError] = useState('');

    if (!isAuthed) {
        return (
            <div className="max-w-xs mx-auto text-center p-8 bg-slate-800 rounded-xl border border-slate-700 shadow-xl mt-8">
                <h2 className="text-xl font-bold text-white mb-6">Panel Administratora</h2>
                <input type="password" value={pin} onChange={e=>{setPin(e.target.value); setError('');}} placeholder="Kod PIN" className="w-full p-3 mb-4 bg-slate-900 border border-slate-600 rounded-lg text-center text-white focus:outline-none focus:border-blue-500" />
                <button onClick={()=>{if(pin==='mirek2026') setIsAuthed(true); else setError('Błędny PIN!');}} className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-lg font-bold transition-colors">Odblokuj</button>
                {error && <p className="text-red-400 text-sm mt-3 font-medium">{error}</p>}
            </div>
        )
    }

    return (
        <div className="pb-6">
            <div className="p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/50 mb-6 shadow-sm">
                <h2 className="text-red-400 font-bold mb-1">Edycja Wyników (Tryb Live)</h2>
                <p className="text-sm text-red-200/80">Wprowadzone wyniki natychmiastowo przeliczają tabele, drabinkę oraz blokują edycję typów dla graczy.</p>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Mecze Fazy Pucharowej</h3>
            {Object.values(bracketMatches).map(m => <MatchCard key={m.id} m={m} result={results[m.id]} isAdmin={true} onSaveResult={onSaveResult} />)}
            
            <h3 className="text-xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2">Mecze Fazy Grupowej</h3>
            {groupMatches.map(m => <MatchCard key={m.id} m={m} result={results[m.id]} isAdmin={true} onSaveResult={onSaveResult} />)}
        </div>
    )
}