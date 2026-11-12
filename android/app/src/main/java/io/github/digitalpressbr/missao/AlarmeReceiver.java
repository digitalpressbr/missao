package io.github.digitalpressbr.missao;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recebe o alarme do celular na hora da chamada. */
public class AlarmeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String acao = i == null ? null : i.getAction();
        if (Agenda.ACAO_CHAMADA.equals(acao)) Agenda.aoDisparar(c);
        else if (Agenda.ACAO_TESTE.equals(acao)) Chamada.teste(c);
    }
}
