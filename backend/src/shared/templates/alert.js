module.exports = function alertTemplate({ title, body }) {
	return {
		subject: title,
		text: body,
		html: `<h3>${title}</h3><p>${body}</p>`,
	};
};