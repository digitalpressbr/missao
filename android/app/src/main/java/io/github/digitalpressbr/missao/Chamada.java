package io.github.digitalpressbr.missao;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

/** A chamada da missão: aviso com o toque do app e tela cheia. */
final class Chamada {
    static final String CANAL = "chamada_missao";
    static final int ID = 1;
    private static final long[] VIBRACAO = {0, 400, 150, 400, 150, 400, 150, 400, 150, 800};
    private static final long SOME_EM_MS = 14 * 60 * 1000L;

    private Chamada() {}

    static void criarCanal(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel canal = new NotificationChannel(CANAL, c.getString(R.string.canal_nome), NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription(c.getString(R.string.canal_descricao));
        // Pelo nome, não pelo número: o número do recurso pode mudar numa atualização e o canal não aceita trocar o som depois.
        Uri som = Uri.parse("android.resource://" + c.getPackageName() + "/raw/alerta_missao");
        // Volume de alarme: toca mesmo com o celular no silencioso.
        canal.setSound(som, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
        canal.enableVibration(true);
        canal.setVibrationPattern(VIBRACAO);
        canal.enableLights(true);
        canal.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(canal);
    }

    static void mostrar(Context c, JSONObject dados, JSONObject chamada) {
        String tipo = chamada.optString("tipo");
        String texto = chamada.optString("texto");
        // App aberto na frente: quem chama é a própria página. A liberação ela já percebe sozinha.
        if (MainActivity.naFrente()) {
            if (!"liberada".equals(tipo)) MainActivity.chamarNaPagina(texto);
            return;
        }
        boolean iniciar = "liberada".equals(tipo) || tipo.startsWith("lembrete");
        exibir(c, dados, chamada.optString("titulo", "Missão do Dia"), texto, iniciar, iniciar ? dados.optInt("robux") : 0);
    }

    static void teste(Context c) {
        exibir(c, Agenda.dados(c), "Teste da chamada", "É assim que o app chama na hora da missão.", false, 0);
    }

    private static void exibir(Context c, JSONObject dados, String titulo, String texto, boolean iniciar, int robux) {
        criarCanal(c);
        Intent tela = new Intent(c, ChamadaActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION)
                .putExtra("titulo", titulo)
                .putExtra("texto", texto)
                .putExtra("tema", dados.optString("tema", "azul"))
                .putExtra("nome", dados.optString("nome"))
                .putExtra("robux", robux)
                .putExtra("iniciar", iniciar);
        int marcas = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent piTela = PendingIntent.getActivity(c, 10, tela, marcas);
        Intent abrir = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("iniciar", iniciar);
        PendingIntent piAbrir = PendingIntent.getActivity(c, 11, abrir, marcas);

        Notification aviso = new NotificationCompat.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_aviso)
                .setColor(0xFF35DFCB)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(texto))
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setTimeoutAfter(SOME_EM_MS)
                .setContentIntent(piAbrir)
                .setFullScreenIntent(piTela, true)
                .build();
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(ID, aviso);

        // Com a permissão de aparecer sobre outros apps, a tela abre por cima do que estiver aberto (um jogo, por exemplo).
        if (Settings.canDrawOverlays(c)) {
            try {
                c.startActivity(tela);
            } catch (RuntimeException e) {
                // o sistema recusou: fica o aviso no alto, com o toque
            }
        }
    }

    static void apagar(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(ID);
    }
}
