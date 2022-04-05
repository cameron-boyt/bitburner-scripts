import { NS } from '@ns'
import { getAllServers } from '/helpers/server-helper.js';
import { genServer } from '/libraries/server-factory';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");

	const servers = getAllServers(ns).map(x => genServer(ns, x));

	while (true) {
		ns.clearLog();

		// Get a list of all currently hackable targets
		const hackable_targets = servers.filter(x => x.isHackableServer).sort((a, b) => a.money.max - b.money.max);

		ns.print(" + >HCK<               { Host } + >GRW<                       { Money } + >WKN<  { Security } +");

		for (const t of hackable_targets) {
			let t_str = `${t.hostname}`;
			let m_str_1 = `${Math.ceil(t.money.current)}`;
			let m_str_2 = `${Math.ceil(t.money.max)}`;
			let s_str_1 = `${Math.ceil(t.security.current)}`;
			let s_str_2 = `${Math.ceil(t.security.min)}`;

			const c_str = (t.money.isMax && t.security.isMin) ? "[X]" : "[ ]";

			let hack, grow, weak = false;

			for (const s of getAllServers(ns).filter(x => ns.hasRootAccess(x))) {
				if (ns.ps(s).filter(x => x.filename === "/hacking/single/hack.js" && x.args[0] === t.hostname).length > 0) { hack = true; }
				if (ns.ps(s).filter(x => x.filename === "/hacking/single/grow.js" && x.args[0] === t.hostname).length > 0) { grow = true; }
				if (ns.ps(s).filter(x => x.filename === "/hacking/single/weak.js" && x.args[0] === t.hostname).length > 0) { weak = true; }
			}

			const h_str = hack ? "(...)" : "     ";
			const g_str = grow ? "(...)" : "     ";
			const w_str = weak ? "(...)" : "     ";

			const host_len = 18;
			const mon_len = 14;
			const sec_len = 5;

			if (t_str.length < host_len) { t_str = " ".repeat(host_len - t_str.length) + t_str; }

			if (m_str_1.length < mon_len) { m_str_1 = " ".repeat(mon_len - m_str_1.length) + m_str_1; }

			if (m_str_2.length < mon_len) { m_str_2 = m_str_2 + " ".repeat(mon_len - m_str_2.length); }

			if (s_str_1.length < sec_len) { s_str_1 = " ".repeat(sec_len - s_str_1.length) + s_str_1; }

			if (s_str_2.length < sec_len) { s_str_2 = s_str_2 + " ".repeat(sec_len - s_str_2.length); }


			ns.print(` | ${h_str} ${t_str} ${c_str} | ${g_str} ${m_str_1} / ${m_str_2} | ${w_str} ${s_str_1} / ${s_str_2} |`);
		}

		await ns.asleep(100);
	}
}
