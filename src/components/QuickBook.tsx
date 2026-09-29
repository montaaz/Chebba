import Icon from "./Icon";

const FIELD = "relative min-w-0 rounded-2xl transition-colors hover:bg-aqua/10 focus-within:bg-aqua/10";
const LABEL = "pointer-events-none absolute top-2.5 left-4 text-[0.64rem] font-semibold tracking-[0.2em] text-aqua uppercase";
/* The control fills the whole cell so the entire area opens the picker.
   16px text: anything smaller makes iOS zoom the page on focus. */
const INPUT = "h-15 w-full cursor-pointer rounded-2xl border-0 bg-transparent px-4 pt-6 pb-1.5 text-base outline-none scheme-dark";

/* Hero booking bar. A plain GET form: it works before any JavaScript has loaded. */
export default function QuickBook({ price, today }: { price: string; today: string }) {
  return (
    <form
      className="grid grid-cols-2 gap-1.5 rounded-[22px] border border-line bg-[#021e20]/60 p-2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-lg md:grid-cols-[1.4fr_1fr_1fr_auto]"
      action="/reserver"
    >
      <label className={`${FIELD} col-span-2 md:col-span-1`}>
        <span className={LABEL}>Je souhaite</span>
        <select className={INPUT} name="mode" defaultValue="transfert">
          <option className="bg-night-2" value="transfert">
            Un transfert (prix au km)
          </option>
          <option className="bg-night-2" value="location">
            Louer la voiture
          </option>
        </select>
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Départ</span>
        <input className={INPUT} type="date" name="from" min={today} />
      </label>
      <label className={FIELD}>
        <span className={LABEL}>Retour</span>
        <input className={INPUT} type="date" name="to" min={today} />
      </label>
      <div className="col-span-2 flex flex-col-reverse justify-center gap-1.5 text-center md:col-span-1 md:flex-col">
        <small className="text-[0.68rem] tracking-[0.08em] text-mist">{price}</small>
        <button className="btn btn--solid min-h-12" type="submit">
          Calculer mon prix <Icon name="arrow" size={18} />
        </button>
      </div>
    </form>
  );
}
