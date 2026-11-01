    /* ================= Languages: English, Français, Español, Português, العربية ================= */
    const LANGS = { en: 'English', fr: 'Français', es: 'Español', pt: 'Português', ar: 'العربية' };
    const STR = {
      en: {
        loading: 'Loading General Ginger…', loadFail: 'Could not load the 3D engine. Check your connection and refresh.',
        intro: "The Ginger King's pest army is firing from the ground. Dodge rot bombs, shears and sticky nets, grab power-ups, and shoot down the King's airship to reach the next level!",
        takeOff: 'Oya, Take Off!', flyAgain: 'Fly Again', loadingAcct: 'Loading your account…', connecting: 'Connecting…',
        hint: '<span>↑ ↓</span> / <span>W S</span> fly up and down • <span>Space</span> spice boost<br>Phone: drag up and down to fly • tap to boost',
        rotate: 'Tip: turn your phone sideways for a wider view', boss: 'THE GINGER KING', cancel: 'Cancel',
        paused: '⏸ Paused', resume: '▶ Resume', quit: 'Quit flight (points not saved)', pauseTip: 'Tip: press P or Esc to pause on a keyboard.', pause: 'Pause',
        guest: 'Playing as a guest. ', signIn: 'Sign in', signUp: 'New player? Sign up', signedIn: 'Signed in. ', chooseTag: 'Choose your gamer tag',
        acct: ' · {total} pts · today {today}/{cap} ', setPw: 'Set password', signOut: 'Sign out', signedOut: 'Signed out',
        loginText: 'Use your gamer tag and password.', phTag: 'Gamer tag', phPw: 'Password', phNewPw: 'New password',
        altEmail: 'New player or forgot your password? Use your email', altLogin: 'Already have a password? Sign in with your gamer tag',
        emailTitle: 'Sign up or reset password', emailText: "Enter your email and we'll send you a sign-in link. You only need it once: after that you sign in with your gamer tag and password.", sendLink: 'Send link',
        codeTitle: 'Check your email', codeText: 'We sent a sign-in email to {email}. Open it on this device and tap the link, or type the 6-digit code if the email shows one. Check spam too.',
        tagTitle: 'Create your player', tagText: 'Pick your gamer tag (3 to 15 letters, numbers or underscores) and a password with at least 8 characters.', save: 'Save',
        pwTitle: 'Set your password', pwText: 'Choose a password with at least 8 characters. Next time, sign in with {tag} and this password.', yourTag: 'your gamer tag', savePw: 'Save password',
        enterTagPw: 'Enter your gamer tag and password.', noConn: 'No connection. Try again.', signInFail: 'Could not sign you in. Try again.', welcomeBack: 'Welcome back, {tag}!',
        badEmail: 'Enter a valid email address.', sendFail: 'Could not send the email. Try again.', tapLink: 'Tap the link in the email, or enter the 6-digit code if it has one.',
        codeBad: 'That code is wrong or has expired. Check it, or press Cancel and send a new one.', tagRule: 'Gamer tag: use 3 to 15 letters, numbers or underscores.',
        welcome: 'Welcome, {tag}! Tap Take Off to fly', pwSaved: 'Password saved', pwShort: 'Use at least 8 characters for your password.', pwLong: 'That password is too long.', pwFail: 'Could not save your password. Try again.',
        stNoSign: 'Not signed in: practice', stOffline: 'Offline: practice mode', stPractice: 'Practice mode', stSignToSave: 'Practice: sign in to save', stOffline2: 'Offline: practice',
        record: '🏆 New Record!', wahala: '💥 Wahala!', kings: ' Beat the King {n}×.',
        summary: 'General Ginger reached level {level}, flew {m} m and scored {score}.{kings} Best: {best}.',
        checking: 'Checking {pts} points with the server…', signToSave: '{pts} points. Sign in to save them next time.', practiceRes: '{pts} points (practice mode, not saved)',
        saved: '✅ {n} points saved · {total} total', capped: ' (daily limit reached)', verified: '✅ {n} points verified and saved', notSaved: '⚠️ Points not saved: {reason}', srvErr: 'server error',
        shears: 'Shears! Ouch!', bomb: 'Rot bomb! Ouch!', net: 'Sticky net! Slowed down', block: 'Blocked by pepper!', jar: '+250 Spice!', pepper: 'Pepper shield!',
        heartFull: 'Ginger root! +1 heart', heart: 'Ginger root!', cannon: 'Spice cannon! Shoot it down', bossIn: 'The Ginger King attacks! (Level {level})',
        kingDown: 'King defeated! +{pts}', levelUp: 'Level {level}! Pests fight harder', go: 'Go!',
        soundOn: 'Sound on', soundOff: 'Sound off', buzzOn: 'Vibration on', buzzOff: 'Vibration off',
        pauseInfo: 'Score {score} · Level {level} · {m} m', cancelled: 'Flight cancelled', quitText: 'You quit at level {level} with {score}. Ready to fly again?', quitRes: 'Points from a quit flight are not saved.',
        pts: '{n} pts', level: 'Level {n}', levelBoss: 'Level {n} · Boss fight', slowed: 'Slowed!', shield: 'Shield {n}s', cannonT: 'Cannon {n}s', language: 'Language'
      },
      fr: {
        loading: 'Chargement de General Ginger…', loadFail: 'Impossible de charger le moteur 3D. Vérifie ta connexion et recharge la page.',
        intro: "L'armée de nuisibles du Roi Gingembre tire depuis le sol. Esquive les bombes pourries, les cisailles et les filets collants, attrape les bonus et abats le dirigeable du Roi pour passer au niveau suivant !",
        takeOff: 'Oya, décollage !', flyAgain: 'Rejouer', loadingAcct: 'Chargement de ton compte…', connecting: 'Connexion…',
        hint: '<span>↑ ↓</span> / <span>W S</span> monter et descendre • <span>Espace</span> turbo épicé<br>Téléphone : glisse vers le haut ou le bas pour voler • touche pour le turbo',
        rotate: 'Astuce : tourne ton téléphone pour une vue plus large', boss: 'LE ROI GINGEMBRE', cancel: 'Annuler',
        paused: '⏸ Pause', resume: '▶ Reprendre', quit: 'Quitter le vol (points non enregistrés)', pauseTip: 'Astuce : appuie sur P ou Échap pour mettre en pause au clavier.', pause: 'Pause',
        guest: 'Tu joues en invité. ', signIn: 'Se connecter', signUp: 'Nouveau joueur ? Inscris-toi', signedIn: 'Connecté. ', chooseTag: 'Choisis ton pseudo',
        acct: ' · {total} pts · aujourd’hui {today}/{cap} ', setPw: 'Mot de passe', signOut: 'Se déconnecter', signedOut: 'Déconnecté',
        loginText: 'Utilise ton pseudo et ton mot de passe.', phTag: 'Pseudo', phPw: 'Mot de passe', phNewPw: 'Nouveau mot de passe',
        altEmail: 'Nouveau joueur ou mot de passe oublié ? Utilise ton e-mail', altLogin: 'Tu as déjà un mot de passe ? Connecte-toi avec ton pseudo',
        emailTitle: 'Inscription ou nouveau mot de passe', emailText: "Entre ton e-mail et nous t'enverrons un lien de connexion. Tu n'en as besoin qu'une fois : ensuite, tu te connectes avec ton pseudo et ton mot de passe.", sendLink: 'Envoyer le lien',
        codeTitle: 'Vérifie tes e-mails', codeText: "Nous avons envoyé un e-mail de connexion à {email}. Ouvre-le sur cet appareil et touche le lien, ou tape le code à 6 chiffres s'il y en a un. Vérifie aussi les spams.",
        tagTitle: 'Crée ton joueur', tagText: 'Choisis ton pseudo (3 à 15 lettres, chiffres ou tirets bas) et un mot de passe d’au moins 8 caractères.', save: 'Enregistrer',
        pwTitle: 'Choisis ton mot de passe', pwText: 'Au moins 8 caractères. La prochaine fois, connecte-toi avec {tag} et ce mot de passe.', yourTag: 'ton pseudo', savePw: 'Enregistrer',
        enterTagPw: 'Entre ton pseudo et ton mot de passe.', noConn: 'Pas de connexion. Réessaie.', signInFail: 'Connexion impossible. Réessaie.', welcomeBack: 'Bon retour, {tag} !',
        badEmail: 'Entre une adresse e-mail valide.', sendFail: "Impossible d'envoyer l'e-mail. Réessaie.", tapLink: "Touche le lien dans l'e-mail, ou entre le code à 6 chiffres s'il y en a un.",
        codeBad: 'Ce code est faux ou a expiré. Vérifie-le, ou appuie sur Annuler pour en recevoir un nouveau.', tagRule: 'Pseudo : 3 à 15 lettres, chiffres ou tirets bas.',
        welcome: 'Bienvenue, {tag} ! Touche Décollage pour voler', pwSaved: 'Mot de passe enregistré', pwShort: 'Ton mot de passe doit faire au moins 8 caractères.', pwLong: 'Ce mot de passe est trop long.', pwFail: "Impossible d'enregistrer ton mot de passe. Réessaie.",
        stNoSign: 'Non connecté : entraînement', stOffline: 'Hors ligne : entraînement', stPractice: 'Entraînement', stSignToSave: 'Entraînement : connecte-toi pour enregistrer', stOffline2: 'Hors ligne : entraînement',
        record: '🏆 Nouveau record !', wahala: '💥 Wahala !', kings: ' Roi battu {n}×.',
        summary: 'General Ginger a atteint le niveau {level}, a volé {m} m et marqué {score}.{kings} Record : {best}.',
        checking: 'Vérification de {pts} points avec le serveur…', signToSave: '{pts} points. Connecte-toi pour les enregistrer la prochaine fois.', practiceRes: '{pts} points (entraînement, non enregistrés)',
        saved: '✅ {n} points enregistrés · {total} au total', capped: ' (limite du jour atteinte)', verified: '✅ {n} points vérifiés et enregistrés', notSaved: '⚠️ Points non enregistrés : {reason}', srvErr: 'erreur du serveur',
        shears: 'Cisailles ! Aïe !', bomb: 'Bombe pourrie ! Aïe !', net: 'Filet collant ! Ralenti', block: 'Bloqué par le piment !', jar: '+250 Épices !', pepper: 'Bouclier piment !',
        heartFull: 'Racine de gingembre ! +1 cœur', heart: 'Racine de gingembre !', cannon: 'Canon à épices ! Abats-les', bossIn: 'Le Roi Gingembre attaque ! (Niveau {level})',
        kingDown: 'Roi vaincu ! +{pts}', levelUp: 'Niveau {level} ! Les nuisibles se déchaînent', go: 'Go !',
        soundOn: 'Son activé', soundOff: 'Son coupé', buzzOn: 'Vibration activée', buzzOff: 'Vibration coupée',
        pauseInfo: 'Score {score} · Niveau {level} · {m} m', cancelled: 'Vol annulé', quitText: 'Tu as quitté au niveau {level} avec {score}. Prêt à revoler ?', quitRes: "Les points d'un vol quitté ne sont pas enregistrés.",
        pts: '{n} pts', level: 'Niveau {n}', levelBoss: 'Niveau {n} · Combat de boss', slowed: 'Ralenti !', shield: 'Bouclier {n}s', cannonT: 'Canon {n}s', language: 'Langue'
      },
      es: {
        loading: 'Cargando General Ginger…', loadFail: 'No se pudo cargar el motor 3D. Revisa tu conexión y recarga.',
        intro: '¡El ejército de plagas del Rey Jengibre dispara desde el suelo! Esquiva bombas podridas, tijeras y redes pegajosas, recoge mejoras y derriba el dirigible del Rey para pasar de nivel.',
        takeOff: '¡Oya, a despegar!', flyAgain: 'Volar otra vez', loadingAcct: 'Cargando tu cuenta…', connecting: 'Conectando…',
        hint: '<span>↑ ↓</span> / <span>W S</span> subir y bajar • <span>Espacio</span> turbo picante<br>Móvil: arrastra arriba y abajo para volar • toca para el turbo',
        rotate: 'Consejo: gira el móvil para ver más', boss: 'EL REY JENGIBRE', cancel: 'Cancelar',
        paused: '⏸ En pausa', resume: '▶ Continuar', quit: 'Abandonar el vuelo (no se guardan los puntos)', pauseTip: 'Consejo: pulsa P o Esc para pausar con teclado.', pause: 'Pausa',
        guest: 'Juegas como invitado. ', signIn: 'Iniciar sesión', signUp: '¿Jugador nuevo? Regístrate', signedIn: 'Sesión iniciada. ', chooseTag: 'Elige tu nombre de jugador',
        acct: ' · {total} pts · hoy {today}/{cap} ', setPw: 'Contraseña', signOut: 'Cerrar sesión', signedOut: 'Sesión cerrada',
        loginText: 'Usa tu nombre de jugador y tu contraseña.', phTag: 'Nombre de jugador', phPw: 'Contraseña', phNewPw: 'Nueva contraseña',
        altEmail: '¿Jugador nuevo u olvidaste tu contraseña? Usa tu correo', altLogin: '¿Ya tienes contraseña? Entra con tu nombre de jugador',
        emailTitle: 'Regístrate o cambia la contraseña', emailText: 'Escribe tu correo y te enviaremos un enlace para entrar. Solo lo necesitas una vez: después entras con tu nombre de jugador y tu contraseña.', sendLink: 'Enviar enlace',
        codeTitle: 'Revisa tu correo', codeText: 'Enviamos un correo a {email}. Ábrelo en este dispositivo y toca el enlace, o escribe el código de 6 cifras si aparece. Revisa también el spam.',
        tagTitle: 'Crea tu jugador', tagText: 'Elige tu nombre de jugador (de 3 a 15 letras, números o guiones bajos) y una contraseña de al menos 8 caracteres.', save: 'Guardar',
        pwTitle: 'Elige tu contraseña', pwText: 'Al menos 8 caracteres. La próxima vez, entra con {tag} y esta contraseña.', yourTag: 'tu nombre de jugador', savePw: 'Guardar contraseña',
        enterTagPw: 'Escribe tu nombre de jugador y tu contraseña.', noConn: 'Sin conexión. Inténtalo de nuevo.', signInFail: 'No pudimos iniciar tu sesión. Inténtalo de nuevo.', welcomeBack: '¡Hola de nuevo, {tag}!',
        badEmail: 'Escribe un correo válido.', sendFail: 'No se pudo enviar el correo. Inténtalo de nuevo.', tapLink: 'Toca el enlace del correo o escribe el código de 6 cifras si lo tiene.',
        codeBad: 'Ese código es incorrecto o ha caducado. Revísalo o pulsa Cancelar para recibir otro.', tagRule: 'Nombre de jugador: de 3 a 15 letras, números o guiones bajos.',
        welcome: '¡Bienvenido, {tag}! Toca Despegar para volar', pwSaved: 'Contraseña guardada', pwShort: 'Usa al menos 8 caracteres en tu contraseña.', pwLong: 'Esa contraseña es demasiado larga.', pwFail: 'No se pudo guardar tu contraseña. Inténtalo de nuevo.',
        stNoSign: 'Sin sesión: práctica', stOffline: 'Sin conexión: modo práctica', stPractice: 'Modo práctica', stSignToSave: 'Práctica: inicia sesión para guardar', stOffline2: 'Sin conexión: práctica',
        record: '🏆 ¡Nuevo récord!', wahala: '💥 ¡Wahala!', kings: ' Venciste al Rey {n}×.',
        summary: 'General Ginger llegó al nivel {level}, voló {m} m y sumó {score}.{kings} Récord: {best}.',
        checking: 'Comprobando {pts} puntos con el servidor…', signToSave: '{pts} puntos. Inicia sesión para guardarlos la próxima vez.', practiceRes: '{pts} puntos (práctica, no se guardan)',
        saved: '✅ {n} puntos guardados · {total} en total', capped: ' (límite diario alcanzado)', verified: '✅ {n} puntos verificados y guardados', notSaved: '⚠️ Puntos no guardados: {reason}', srvErr: 'error del servidor',
        shears: '¡Tijeras! ¡Ay!', bomb: '¡Bomba podrida! ¡Ay!', net: '¡Red pegajosa! Vas más lento', block: '¡Bloqueado por el chile!', jar: '¡+250 Especias!', pepper: '¡Escudo de chile!',
        heartFull: '¡Raíz de jengibre! +1 corazón', heart: '¡Raíz de jengibre!', cannon: '¡Cañón de especias! Derríbalos', bossIn: '¡Ataca el Rey Jengibre! (Nivel {level})',
        kingDown: '¡Rey derrotado! +{pts}', levelUp: '¡Nivel {level}! Las plagas atacan con más fuerza', go: '¡Ya!',
        soundOn: 'Sonido activado', soundOff: 'Sonido apagado', buzzOn: 'Vibración activada', buzzOff: 'Vibración apagada',
        pauseInfo: 'Puntuación {score} · Nivel {level} · {m} m', cancelled: 'Vuelo cancelado', quitText: 'Abandonaste en el nivel {level} con {score}. ¿Listo para volar otra vez?', quitRes: 'Los puntos de un vuelo abandonado no se guardan.',
        pts: '{n} pts', level: 'Nivel {n}', levelBoss: 'Nivel {n} · Jefe final', slowed: '¡Más lento!', shield: 'Escudo {n}s', cannonT: 'Cañón {n}s', language: 'Idioma'
      },
      pt: {
        loading: 'Carregando General Ginger…', loadFail: 'Não foi possível carregar o motor 3D. Verifique sua conexão e recarregue.',
        intro: 'O exército de pragas do Rei Gengibre está atirando do chão! Desvie de bombas podres, tesouras e redes grudentas, pegue power-ups e derrube o dirigível do Rei para passar de nível.',
        takeOff: 'Oya, decolar!', flyAgain: 'Voar de novo', loadingAcct: 'Carregando sua conta…', connecting: 'Conectando…',
        hint: '<span>↑ ↓</span> / <span>W S</span> subir e descer • <span>Espaço</span> turbo apimentado<br>Celular: arraste para cima e para baixo para voar • toque para o turbo',
        rotate: 'Dica: vire o celular para ver mais', boss: 'O REI GENGIBRE', cancel: 'Cancelar',
        paused: '⏸ Pausado', resume: '▶ Continuar', quit: 'Sair do voo (pontos não são salvos)', pauseTip: 'Dica: aperte P ou Esc para pausar no teclado.', pause: 'Pausar',
        guest: 'Jogando como convidado. ', signIn: 'Entrar', signUp: 'Jogador novo? Cadastre-se', signedIn: 'Conectado. ', chooseTag: 'Escolha seu nome de jogador',
        acct: ' · {total} pts · hoje {today}/{cap} ', setPw: 'Senha', signOut: 'Sair', signedOut: 'Você saiu',
        loginText: 'Use seu nome de jogador e senha.', phTag: 'Nome de jogador', phPw: 'Senha', phNewPw: 'Nova senha',
        altEmail: 'Jogador novo ou esqueceu a senha? Use seu e-mail', altLogin: 'Já tem senha? Entre com seu nome de jogador',
        emailTitle: 'Cadastro ou nova senha', emailText: 'Digite seu e-mail e enviaremos um link de acesso. Você só precisa dele uma vez: depois, entra com seu nome de jogador e senha.', sendLink: 'Enviar link',
        codeTitle: 'Confira seu e-mail', codeText: 'Enviamos um e-mail para {email}. Abra neste aparelho e toque no link, ou digite o código de 6 dígitos se aparecer. Confira também o spam.',
        tagTitle: 'Crie seu jogador', tagText: 'Escolha seu nome de jogador (3 a 15 letras, números ou sublinhados) e uma senha com pelo menos 8 caracteres.', save: 'Salvar',
        pwTitle: 'Defina sua senha', pwText: 'Pelo menos 8 caracteres. Da próxima vez, entre com {tag} e esta senha.', yourTag: 'seu nome de jogador', savePw: 'Salvar senha',
        enterTagPw: 'Digite seu nome de jogador e senha.', noConn: 'Sem conexão. Tente de novo.', signInFail: 'Não foi possível entrar. Tente de novo.', welcomeBack: 'Bem-vindo de volta, {tag}!',
        badEmail: 'Digite um e-mail válido.', sendFail: 'Não foi possível enviar o e-mail. Tente de novo.', tapLink: 'Toque no link do e-mail ou digite o código de 6 dígitos, se houver.',
        codeBad: 'Esse código está errado ou expirou. Confira ou toque em Cancelar para receber outro.', tagRule: 'Nome de jogador: 3 a 15 letras, números ou sublinhados.',
        welcome: 'Bem-vindo, {tag}! Toque em Decolar para voar', pwSaved: 'Senha salva', pwShort: 'Use pelo menos 8 caracteres na senha.', pwLong: 'Essa senha é longa demais.', pwFail: 'Não foi possível salvar sua senha. Tente de novo.',
        stNoSign: 'Sem login: treino', stOffline: 'Offline: modo treino', stPractice: 'Modo treino', stSignToSave: 'Treino: entre para salvar', stOffline2: 'Offline: treino',
        record: '🏆 Novo recorde!', wahala: '💥 Wahala!', kings: ' Venceu o Rei {n}×.',
        summary: 'General Ginger chegou ao nível {level}, voou {m} m e fez {score}.{kings} Recorde: {best}.',
        checking: 'Conferindo {pts} pontos com o servidor…', signToSave: '{pts} pontos. Entre para salvá-los da próxima vez.', practiceRes: '{pts} pontos (treino, não salvos)',
        saved: '✅ {n} pontos salvos · {total} no total', capped: ' (limite diário atingido)', verified: '✅ {n} pontos verificados e salvos', notSaved: '⚠️ Pontos não salvos: {reason}', srvErr: 'erro no servidor',
        shears: 'Tesouras! Ai!', bomb: 'Bomba podre! Ai!', net: 'Rede grudenta! Mais devagar', block: 'Bloqueado pela pimenta!', jar: '+250 Temperos!', pepper: 'Escudo de pimenta!',
        heartFull: 'Raiz de gengibre! +1 coração', heart: 'Raiz de gengibre!', cannon: 'Canhão de temperos! Derrube tudo', bossIn: 'O Rei Gengibre ataca! (Nível {level})',
        kingDown: 'Rei derrotado! +{pts}', levelUp: 'Nível {level}! As pragas estão mais fortes', go: 'Vai!',
        soundOn: 'Som ligado', soundOff: 'Som desligado', buzzOn: 'Vibração ligada', buzzOff: 'Vibração desligada',
        pauseInfo: 'Pontos {score} · Nível {level} · {m} m', cancelled: 'Voo cancelado', quitText: 'Você saiu no nível {level} com {score}. Pronto para voar de novo?', quitRes: 'Pontos de um voo abandonado não são salvos.',
        pts: '{n} pts', level: 'Nível {n}', levelBoss: 'Nível {n} · Chefão', slowed: 'Mais devagar!', shield: 'Escudo {n}s', cannonT: 'Canhão {n}s', language: 'Idioma'
      },
      ar: {
        loading: 'جارٍ تحميل General Ginger…', loadFail: 'تعذّر تحميل محرك الرسوم ثلاثية الأبعاد. تحقّق من اتصالك وأعد تحميل الصفحة.',
        intro: 'جيش آفات ملك الزنجبيل يطلق النار من الأرض! تفادَ القنابل الفاسدة والمقصّات والشِّباك اللزجة، واجمع المكافآت، وأسقط منطاد الملك لتنتقل إلى المستوى التالي!',
        takeOff: 'هيّا، أقلِع!', flyAgain: 'طِر مجددًا', loadingAcct: 'جارٍ تحميل حسابك…', connecting: 'جارٍ الاتصال…',
        hint: '<span>↑ ↓</span> / <span>W S</span> للصعود والنزول • <span>Space</span> دفعة التوابل<br>على الهاتف: اسحب للأعلى والأسفل للطيران • انقر للدفعة',
        rotate: 'نصيحة: أدِر هاتفك أفقيًا لرؤية أوسع', boss: 'ملك الزنجبيل', cancel: 'إلغاء',
        paused: '⏸ متوقف مؤقتًا', resume: '▶ استئناف', quit: 'إنهاء الرحلة (لن تُحفظ النقاط)', pauseTip: 'نصيحة: اضغط P أو Esc للإيقاف المؤقت من لوحة المفاتيح.', pause: 'إيقاف مؤقت',
        guest: 'تلعب كضيف. ', signIn: 'تسجيل الدخول', signUp: 'لاعب جديد؟ أنشئ حسابًا', signedIn: 'تم تسجيل الدخول. ', chooseTag: 'اختر اسم اللاعب',
        acct: ' · {total} نقطة · اليوم {today}/{cap} ', setPw: 'كلمة المرور', signOut: 'تسجيل الخروج', signedOut: 'تم تسجيل الخروج',
        loginText: 'استخدم اسم اللاعب وكلمة المرور.', phTag: 'اسم اللاعب', phPw: 'كلمة المرور', phNewPw: 'كلمة مرور جديدة',
        altEmail: 'لاعب جديد أو نسيت كلمة المرور؟ استخدم بريدك الإلكتروني', altLogin: 'لديك كلمة مرور؟ سجّل الدخول باسم اللاعب',
        emailTitle: 'إنشاء حساب أو استعادة كلمة المرور', emailText: 'أدخل بريدك الإلكتروني وسنرسل لك رابط تسجيل الدخول. تحتاجه مرة واحدة فقط، وبعدها تسجّل الدخول باسم اللاعب وكلمة المرور.', sendLink: 'إرسال الرابط',
        codeTitle: 'تحقّق من بريدك', codeText: 'أرسلنا رسالة إلى {email}. افتحها على هذا الجهاز وانقر على الرابط، أو اكتب الرمز المكوّن من 6 أرقام إن وُجد. تحقّق من مجلد الرسائل غير المرغوبة أيضًا.',
        tagTitle: 'أنشئ لاعبك', tagText: 'اختر اسم لاعب (من 3 إلى 15 حرفًا لاتينيًا أو رقمًا أو شرطة سفلية) وكلمة مرور من 8 أحرف على الأقل.', save: 'حفظ',
        pwTitle: 'عيّن كلمة المرور', pwText: '8 أحرف على الأقل. في المرة القادمة سجّل الدخول باسم {tag} وكلمة المرور هذه.', yourTag: 'اسم اللاعب', savePw: 'حفظ كلمة المرور',
        enterTagPw: 'أدخل اسم اللاعب وكلمة المرور.', noConn: 'لا يوجد اتصال. حاول مرة أخرى.', signInFail: 'تعذّر تسجيل دخولك. حاول مرة أخرى.', welcomeBack: 'مرحبًا بعودتك، {tag}!',
        badEmail: 'أدخل بريدًا إلكترونيًا صحيحًا.', sendFail: 'تعذّر إرسال البريد. حاول مرة أخرى.', tapLink: 'انقر على الرابط في البريد، أو أدخل الرمز المكوّن من 6 أرقام إن وُجد.',
        codeBad: 'هذا الرمز خاطئ أو منتهي الصلاحية. تحقّق منه، أو اضغط إلغاء واطلب رمزًا جديدًا.', tagRule: 'اسم اللاعب: من 3 إلى 15 حرفًا لاتينيًا أو رقمًا أو شرطة سفلية.',
        welcome: 'أهلًا {tag}! اضغط «أقلِع» لتطير', pwSaved: 'تم حفظ كلمة المرور', pwShort: 'استخدم 8 أحرف على الأقل لكلمة المرور.', pwLong: 'كلمة المرور طويلة جدًا.', pwFail: 'تعذّر حفظ كلمة المرور. حاول مرة أخرى.',
        stNoSign: 'غير مسجّل: تدريب', stOffline: 'غير متصل: وضع التدريب', stPractice: 'وضع التدريب', stSignToSave: 'تدريب: سجّل الدخول للحفظ', stOffline2: 'غير متصل: تدريب',
        record: '🏆 رقم قياسي جديد!', wahala: '💥 Wahala!', kings: ' هزمت الملك {n}×.',
        summary: 'وصل General Ginger إلى المستوى {level}، وطار {m} م وسجّل {score}.{kings} الأفضل: {best}.',
        checking: 'جارٍ التحقق من {pts} نقطة مع الخادم…', signToSave: '{pts} نقطة. سجّل الدخول لحفظها في المرة القادمة.', practiceRes: '{pts} نقطة (تدريب، لم تُحفظ)',
        saved: '✅ حُفظت {n} نقطة · المجموع {total}', capped: ' (بلغت الحد اليومي)', verified: '✅ تم التحقق من {n} نقطة وحفظها', notSaved: '⚠️ لم تُحفظ النقاط: {reason}', srvErr: 'خطأ في الخادم',
        shears: 'مقصّ! آخ!', bomb: 'قنبلة فاسدة! آخ!', net: 'شبكة لزجة! تباطأت', block: 'صدّها الفلفل!', jar: '+250 توابل!', pepper: 'درع الفلفل!',
        heartFull: 'جذر زنجبيل! +1 قلب', heart: 'جذر زنجبيل!', cannon: 'مدفع التوابل! أسقطهم', bossIn: 'ملك الزنجبيل يهاجم! (المستوى {level})',
        kingDown: 'هُزم الملك! +{pts}', levelUp: 'المستوى {level}! الآفات تشتد', go: 'انطلق!',
        soundOn: 'الصوت مفعّل', soundOff: 'الصوت متوقف', buzzOn: 'الاهتزاز مفعّل', buzzOff: 'الاهتزاز متوقف',
        pauseInfo: 'النقاط {score} · المستوى {level} · {m} م', cancelled: 'أُلغيت الرحلة', quitText: 'خرجت في المستوى {level} بنتيجة {score}. مستعد للطيران مجددًا؟', quitRes: 'لا تُحفظ نقاط الرحلة التي خرجت منها.',
        pts: '{n} نقطة', level: 'المستوى {n}', levelBoss: 'المستوى {n} · معركة الزعيم', slowed: 'تباطأت!', shield: 'درع {n}ث', cannonT: 'مدفع {n}ث', language: 'اللغة'
      }
    };
    // Messages that come from the server, translated by their English text
    const SRV = {
      'Wrong gamer tag or password.': { fr: 'Pseudo ou mot de passe incorrect.', es: 'Nombre de jugador o contraseña incorrectos.', pt: 'Nome de jogador ou senha incorretos.', ar: 'اسم اللاعب أو كلمة المرور غير صحيحة.' },
      'Too many tries. Wait 15 minutes, or sign in with your email instead.': { fr: 'Trop de tentatives. Attends 15 minutes ou connecte-toi avec ton e-mail.', es: 'Demasiados intentos. Espera 15 minutos o entra con tu correo.', pt: 'Tentativas demais. Espere 15 minutos ou entre com seu e-mail.', ar: 'محاولات كثيرة. انتظر 15 دقيقة أو سجّل الدخول ببريدك الإلكتروني.' },
      'That gamer tag is taken. Try another.': { fr: 'Ce pseudo est déjà pris. Essaie-en un autre.', es: 'Ese nombre ya está en uso. Prueba otro.', pt: 'Esse nome já está em uso. Tente outro.', ar: 'اسم اللاعب هذا مستخدم. جرّب اسمًا آخر.' },
      'Gamer tag must be 3 to 15 letters, numbers or underscores.': { fr: 'Le pseudo doit faire 3 à 15 lettres, chiffres ou tirets bas.', es: 'El nombre debe tener de 3 a 15 letras, números o guiones bajos.', pt: 'O nome deve ter de 3 a 15 letras, números ou sublinhados.', ar: 'يجب أن يتكوّن اسم اللاعب من 3 إلى 15 حرفًا لاتينيًا أو رقمًا أو شرطة سفلية.' },
      'Could not save your gamer tag. Try again.': { fr: "Impossible d'enregistrer ton pseudo. Réessaie.", es: 'No se pudo guardar tu nombre. Inténtalo de nuevo.', pt: 'Não foi possível salvar seu nome. Tente de novo.', ar: 'تعذّر حفظ اسم اللاعب. حاول مرة أخرى.' },
      'Sign in to save points.': { fr: 'Connecte-toi pour enregistrer tes points.', es: 'Inicia sesión para guardar puntos.', pt: 'Entre para salvar pontos.', ar: 'سجّل الدخول لحفظ النقاط.' },
      'Your sign-in has expired. Sign in again.': { fr: 'Ta session a expiré. Reconnecte-toi.', es: 'Tu sesión caducó. Vuelve a entrar.', pt: 'Sua sessão expirou. Entre de novo.', ar: 'انتهت صلاحية تسجيل الدخول. سجّل الدخول مجددًا.' },
      'Choose a gamer tag first.': { fr: "Choisis d'abord un pseudo.", es: 'Primero elige un nombre de jugador.', pt: 'Primeiro escolha um nome de jogador.', ar: 'اختر اسم لاعب أولًا.' },
      'unknown or used session': { fr: 'partie inconnue ou déjà utilisée', es: 'partida desconocida o ya usada', pt: 'partida desconhecida ou já usada', ar: 'جلسة غير معروفة أو مستخدمة' },
      'score did not match replay': { fr: 'le score ne correspond pas à la partie', es: 'la puntuación no coincide con la partida', pt: 'a pontuação não confere com a partida', ar: 'النتيجة لا تطابق إعادة اللعب' },
      'game finished faster than real time': { fr: 'partie terminée trop vite', es: 'partida terminada demasiado rápido', pt: 'partida terminou rápido demais', ar: 'انتهت اللعبة أسرع من الوقت الحقيقي' },
      'game version changed, update the app': { fr: 'nouvelle version du jeu, recharge la page', es: 'cambió la versión del juego, recarga la página', pt: 'a versão do jogo mudou, recarregue a página', ar: 'تغيّر إصدار اللعبة، أعد تحميل الصفحة' },
      'no connection': { fr: 'pas de connexion', es: 'sin conexión', pt: 'sem conexão', ar: 'لا يوجد اتصال' }
    };
    const pickLang = () => {
      let saved = null; try { saved = localStorage.getItem('ggLang'); } catch (e) {}
      if (saved && LANGS[saved]) return saved;
      const fromUrl = new URLSearchParams(location.search).get('lang');
      if (fromUrl && LANGS[fromUrl]) return fromUrl;
      const pref = (navigator.languages || [navigator.language || 'en']).map(l => String(l).slice(0, 2).toLowerCase()).find(l => LANGS[l]);
      return pref || 'en';
    };
    const LANG = pickLang();
    function t(key, vars) {
      let s = (STR[LANG] && STR[LANG][key]) || STR.en[key] || key;
      if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
      return s;
    }
    const tr = msg => (msg && SRV[msg] && SRV[msg][LANG]) || msg; // server message in the player's language
    const fmt = n => Number(n || 0).toLocaleString(LANG === 'ar' ? 'en' : LANG);
    function applyLang() {
      document.documentElement.lang = LANG;
      document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
      document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
      document.querySelectorAll('[data-th]').forEach(el => { el.innerHTML = t(el.dataset.th); });
      document.querySelectorAll('[data-ta]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.ta)); });
      const sel = document.getElementById('lang');
      if (sel && !sel.options.length) {
        for (const k in LANGS) sel.add(new Option(LANGS[k], k));
        sel.value = LANG;
        sel.setAttribute('aria-label', t('language'));
        sel.addEventListener('change', () => { try { localStorage.setItem('ggLang', sel.value); } catch (e) {} location.reload(); });
      }
    }
    applyLang();

