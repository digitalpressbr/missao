package io.github.digitalpressbr.missao;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** O celular reiniciou, o app foi atualizado ou o relógio mudou: arma de novo a próxima chamada. */
public class ReligarReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Agenda.programar(c);
    }
}
