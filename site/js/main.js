document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  document.querySelectorAll('.filter-bar').forEach(function (bar) {
    var chips = bar.querySelectorAll('.filter-chip');
    var group = bar.getAttribute('data-target');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var value = chip.getAttribute('data-filter');
        if (!group) return;
        document.querySelectorAll('[data-group="' + group + '"]').forEach(function (item) {
          var cat = item.getAttribute('data-category');
          item.style.display = (value === 'todos' || cat === value) ? '' : 'none';
        });
      });
    });
  });

  document.querySelectorAll('.case-box').forEach(function (box) {
    var options = box.querySelectorAll('.case-option');
    var feedback = box.querySelector('.case-feedback');
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        options.forEach(function (o) {
          o.classList.remove('correct', 'wrong');
          o.disabled = true;
        });
        if (opt.getAttribute('data-correct') === 'true') {
          opt.classList.add('correct');
        } else {
          opt.classList.add('wrong');
          var right = box.querySelector('.case-option[data-correct="true"]');
          if (right) right.classList.add('correct');
        }
        if (feedback) feedback.classList.add('show');
      });
    });
  });

  var leadForms = document.querySelectorAll('.js-lead-form');
  leadForms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = form.closest('.lead-form') || form;
      box.innerHTML = '<div style="text-align:center;padding:20px 0;"><h3 style="margin-bottom:8px;">Cadastro recebido</h3><p style="color:var(--ink-soft);margin:0;">Confira sua caixa de entrada — o material chega em instantes. (Formulário de demonstração, integração de envio ainda não conectada.)</p></div>';
    });
  });
});
