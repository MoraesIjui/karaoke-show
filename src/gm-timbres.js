/**
 * Paleta leve de timbres General MIDI, inspirada no agrupamento por famílias
 * de projetos WebAudioFont; todos os osciladores são sintetizados localmente.
 * Não usa SoundFonts de terceiros nem baixa amostras.
 */
const profiles=[
 // Piano, chromatic percussion, organ, guitar, bass, strings, ensemble, brass
 {wave:'triangle',attack:.005,release:.19,filter:3200,harmonic:.21,ratio:2},
 {wave:'sine',attack:.003,release:.32,filter:5500,harmonic:.36,ratio:3},
 {wave:'sine',attack:.025,release:.12,filter:3700,harmonic:.24,ratio:2},
 {wave:'triangle',attack:.004,release:.14,filter:2600,harmonic:.17,ratio:2},
 {wave:'sine',attack:.006,release:.09,filter:1850,harmonic:.24,ratio:2},
 {wave:'sawtooth',attack:.13,release:.35,filter:1600,harmonic:.15,ratio:2},
 {wave:'triangle',attack:.09,release:.28,filter:2400,harmonic:.16,ratio:2},
 {wave:'sawtooth',attack:.035,release:.15,filter:1900,harmonic:.2,ratio:2},
 // Reed, pipe, synth lead, synth pad, synth effects, ethnic, percussive, sfx
 {wave:'square',attack:.025,release:.12,filter:1250,harmonic:.11,ratio:3},
 {wave:'sine',attack:.045,release:.16,filter:3200,harmonic:.11,ratio:2},
 {wave:'sawtooth',attack:.009,release:.12,filter:2700,harmonic:.17,ratio:2},
 {wave:'triangle',attack:.11,release:.39,filter:2200,harmonic:.2,ratio:2},
 {wave:'sine',attack:.11,release:.24,filter:4400,harmonic:.27,ratio:3},
 {wave:'triangle',attack:.025,release:.21,filter:2900,harmonic:.14,ratio:2},
 {wave:'triangle',attack:.003,release:.1,filter:3900,harmonic:.2,ratio:3},
 {wave:'sine',attack:.025,release:.24,filter:2000,harmonic:.16,ratio:2}
];
export function gmProfile(program){
 const p=Number(program);
 if(!Number.isInteger(p)||p<0||p>127)return profiles[0];
 return profiles[Math.floor(p/8)];
}
export function sanitizeMidiQuality(value) {
 return ['economico','equilibrado','rico'].includes(value)?value:'equilibrado';
}
