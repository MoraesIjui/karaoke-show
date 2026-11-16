import { consumePasswordRecoveryRedirect, updatePasswordFromRecovery, sendPasswordRecovery } from './cloud.js';

const message = document.getElementById('message');
const passwordForm = document.getElementById('new-password');
const requestForm = document.getElementById('request-reset');
function show(text, error = false) {
  message.textContent = text;
  message.classList.toggle('error', error);
}
function busy(form, value) {
  const button = form.querySelector('button');
  button.disabled = value;
}
async function start() {
  try {
    const result = await consumePasswordRecoveryRedirect();
    if (result?.status === 'ready') {
      passwordForm.hidden = false;
      show('Link validado. Escolha sua nova senha. Ela também será utilizada por outros aplicativos que compartilhem essa conta Supabase Auth.');
    } else {
      requestForm.hidden = false;
      show(result?.message || 'Esta página não recebeu um token de recuperação válido. Solicite um novo link abaixo. Se o e-mail levar apenas à página inicial do site, confira a configuração de Redirect URLs no Supabase.', true);
    }
  } catch {
    requestForm.hidden = false;
    show('Não foi possível validar o link. Solicite outro.', true);
  }
}
passwordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(passwordForm);
  const password = String(values.get('password') || '');
  if (password !== String(values.get('confirm') || '')) {
    show('As senhas não coincidem.', true);
    return;
  }
  busy(passwordForm, true);
  try {
    await updatePasswordFromRecovery(password);
    passwordForm.hidden = true;
    show('Senha atualizada! Volte ao Karaoke Show, abra Catálogo online e entre com sua nova senha.');
  } catch (err) {
    show('Não foi possível salvar: ' + err.message, true);
  } finally {
    busy(passwordForm, false);
  }
});
requestForm.addEventListener('submit', async event => {
  event.preventDefault();
  busy(requestForm, true);
  try {
    await sendPasswordRecovery(String(new FormData(requestForm).get('email') || ''));
    show('Solicitação enviada. Se o e-mail estiver cadastrado, uma mensagem chegará na sua caixa de entrada. Use apenas o link mais recente.');
  } catch(err) {
    show('Não foi possível solicitar: ' + err.message, true);
  } finally {
    busy(requestForm, false);
  }
});
start();
