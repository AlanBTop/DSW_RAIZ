(() => {
  function digits(value) {
    const text = value.trim();
    if (!/^\+?[\d\s().-]*$/.test(text)) return null;
    const digits = text.replace(/\D/g, '');
    if (text.startsWith('+')) return digits.startsWith('55') ? digits.slice(2) : null;
    return /^55\d{10,11}$/.test(digits) ? digits.slice(2) : digits;
  }

  function format(value) {
    const normalized = digits(value);
    if (normalized === null) return value.slice(0, 19);
    const local = normalized.slice(0, 11);
    if (value.trim().startsWith('+') && local.length < 11 && !valid(local)) return value;
    if (local.length === 11) return local.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (local.length > 6) return local.replace(/^(\d{2})(\d{4})(\d+)$/, '($1) $2-$3');
    if (local.length > 2) return local.replace(/^(\d{2})(\d+)$/, '($1) $2');
    return local ? '(' + local : '';
  }

  function valid(raw) {
    const validDdd = /^(?:1[1-9]|2[12478]|3[1-578]|4[1-9]|5[1345]|6[1-9]|7[134579]|8[1-9]|9[1-9])$/.test(raw?.slice(0, 2));
    return validDdd && /^\d{2}(?:9\d{8}|[2-5]\d{7})$/.test(raw);
  }

  window.RaizPhone = { digits, format, valid };
})();
