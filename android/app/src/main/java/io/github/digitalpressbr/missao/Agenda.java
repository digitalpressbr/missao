package io.github.digitalpressbr.missao;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Agenda das chamadas da missão. O app (a página) entrega a lista dos próximos dias;
 * daqui em diante o alarme do próprio celular chama na hora, com o app fechado e sem internet.
 */
final class Agenda {
    static final String ACAO_CHAMADA = "io.github.digitalpressbr.missao.CHAMADA";
    static final String ACAO_TESTE = "io.github.digitalpressbr.missao.TESTE";

    private static final String GUARDA = "agenda";
    private static final String DADOS = "dados";
    private static final String PENDENTE = "pendente";
    // Chamada mais velha do que isso não sai atrasada (celular estava desligado, por exemplo).
    private static final long TOLERANCIA_MS = 20 * 60 * 1000L;
    private static final long FOLGA_MS = 30 * 1000L;

    private Agenda() {}

    static SharedPreferences guarda(Context c) {
        return c.getSharedPreferences(GUARDA, Context.MODE_PRIVATE);
    }

    static JSONObject dados(Context c) {
        try {
            return new JSONObject(guarda(c).getString(DADOS, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    /** Troca a agenda inteira pela que a página mandou. */
    static void guardar(Context c, String json) {
        try {
            JSONObject o = new JSONObject(json);
            if (o.optJSONArray("chamadas") == null) o.put("chamadas", new JSONArray());
            guarda(c).edit().putString(DADOS, o.toString()).commit();
        } catch (JSONException e) {
            return;
        }
        programar(c);
    }

    /** Arma o alarme da próxima chamada, ou desarma se não há nenhuma. */
    static void programar(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = intencao(c, ACAO_CHAMADA, 1);
        long agora = System.currentTimeMillis();
        long proxima = Long.MAX_VALUE;
        JSONArray lista = dados(c).optJSONArray("chamadas");
        for (int i = 0; lista != null && i < lista.length(); i++) {
            JSONObject it = lista.optJSONObject(i);
            if (it == null) continue;
            long quando = it.optLong("quando");
            if (quando >= agora - TOLERANCIA_MS && quando < proxima) proxima = quando;
        }
        if (proxima == Long.MAX_VALUE) {
            am.cancel(pi);
            return;
        }
        armar(c, am, Math.max(proxima, agora + 1000), pi);
    }

    /** O alarme tocou: mostra a chamada devida (a mais recente) e arma a seguinte. */
    static void aoDisparar(Context c) {
        JSONObject d = dados(c);
        JSONArray lista = d.optJSONArray("chamadas");
        long agora = System.currentTimeMillis();
        JSONObject devida = null;
        JSONArray resto = new JSONArray();
        for (int i = 0; lista != null && i < lista.length(); i++) {
            JSONObject it = lista.optJSONObject(i);
            if (it == null) continue;
            long quando = it.optLong("quando");
            if (quando > agora + FOLGA_MS) {
                resto.put(it);
            } else if (quando >= agora - TOLERANCIA_MS && (devida == null || quando > devida.optLong("quando"))) {
                devida = it;
            }
        }
        try {
            d.put("chamadas", resto);
            guarda(c).edit().putString(DADOS, d.toString()).commit();
        } catch (JSONException e) {
            // segue: a chamada sai do mesmo jeito
        }
        if (devida != null) Chamada.mostrar(c, d, devida);
        programar(c);
    }

    /** Chamada de teste daqui a alguns segundos, para dar tempo de sair do app ou bloquear a tela. */
    static void testarEm(Context c, long milissegundos) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        armar(c, am, System.currentTimeMillis() + milissegundos, intencao(c, ACAO_TESTE, 2));
    }

    static void pedirIniciar(Context c) {
        guarda(c).edit().putString(PENDENTE, "iniciar").commit();
    }

    /** O que a página deve fazer ao abrir ("iniciar" ou nada). Lê e apaga. */
    static String pendente(Context c) {
        SharedPreferences g = guarda(c);
        String p = g.getString(PENDENTE, "");
        if (!p.isEmpty()) g.edit().remove(PENDENTE).commit();
        return p;
    }

    private static void armar(Context c, AlarmManager am, long quando, PendingIntent pi) {
        boolean exato = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (!exato) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, quando, pi);
            return;
        }
        // Alarme de relógio: é o único que o Android não atrasa para economizar bateria.
        PendingIntent abrir = PendingIntent.getActivity(c, 3, new Intent(c, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(quando, abrir), pi);
    }

    private static PendingIntent intencao(Context c, String acao, int codigo) {
        Intent i = new Intent(c, AlarmeReceiver.class).setAction(acao);
        return PendingIntent.getBroadcast(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
