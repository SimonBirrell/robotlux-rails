/*
 * jQuery File Upload User Interface Plugin 8.8.7
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *//*jslint nomen: true, unparam: true, regexp: true *//*global define, window, URL, webkitURL, FileReader */(function(e) {
    "use strict";
    typeof define == "function" && define.amd ? define([ "jquery", "tmpl", "./jquery.fileupload-image", "./jquery.fileupload-audio", "./jquery.fileupload-video", "./jquery.fileupload-validate" ], e) : e(window.jQuery, window.tmpl);
})(function(e, t, n) {
    "use strict";
    e.blueimp.fileupload.prototype._specialOptions.push("filesContainer", "uploadTemplateId", "downloadTemplateId");
    e.widget("blueimp.fileupload", e.blueimp.fileupload, {
        options: {
            autoUpload: !1,
            uploadTemplateId: "template-upload",
            downloadTemplateId: "template-download",
            filesContainer: undefined,
            prependFiles: !1,
            dataType: "json",
            getNumberOfFiles: function() {
                return this.filesContainer.children().length;
            },
            getFilesFromResponse: function(t) {
                return t.result && e.isArray(t.result.files) ? t.result.files : [];
            },
            add: function(t, n) {
                var r = e(this), i = r.data("blueimp-fileupload") || r.data("fileupload"), s = i.options, o = n.files;
                n.process(function() {
                    return r.fileupload("process", n);
                }).always(function() {
                    n.context = i._renderUpload(o).data("data", n);
                    i._renderPreviews(n);
                    s.filesContainer[s.prependFiles ? "prepend" : "append"](n.context);
                    i._forceReflow(n.context);
                    i._transition(n.context).done(function() {
                        i._trigger("added", t, n) !== !1 && (s.autoUpload || n.autoUpload) && n.autoUpload !== !1 && !n.files.error && n.submit();
                    });
                });
            },
            send: function(t, n) {
                var r = e(this).data("blueimp-fileupload") || e(this).data("fileupload");
                n.context && n.dataType && n.dataType.substr(0, 6) === "iframe" && n.context.find(".progress").addClass(!e.support.transition && "progress-animated").attr("aria-valuenow", 100).children().first().css("width", "100%");
                return r._trigger("sent", t, n);
            },
            done: function(t, n) {
                var r = e(this).data("blueimp-fileupload") || e(this).data("fileupload"), i = n.getFilesFromResponse || r.options.getFilesFromResponse, s = i(n), o, u;
                if (n.context) n.context.each(function(i) {
                    var a = s[i] || {
                        error: "Empty file upload result"
                    };
                    u = r._addFinishedDeferreds();
                    r._transition(e(this)).done(function() {
                        var i = e(this);
                        o = r._renderDownload([ a ]).replaceAll(i);
                        r._forceReflow(o);
                        r._transition(o).done(function() {
                            n.context = e(this);
                            r._trigger("completed", t, n);
                            r._trigger("finished", t, n);
                            u.resolve();
                        });
                    });
                }); else {
                    o = r._renderDownload(s)[r.options.prependFiles ? "prependTo" : "appendTo"](r.options.filesContainer);
                    r._forceReflow(o);
                    u = r._addFinishedDeferreds();
                    r._transition(o).done(function() {
                        n.context = e(this);
                        r._trigger("completed", t, n);
                        r._trigger("finished", t, n);
                        u.resolve();
                    });
                }
            },
            fail: function(t, n) {
                var r = e(this).data("blueimp-fileupload") || e(this).data("fileupload"), i, s;
                if (n.context) n.context.each(function(o) {
                    if (n.errorThrown !== "abort") {
                        var u = n.files[o];
                        u.error = u.error || n.errorThrown || !0;
                        s = r._addFinishedDeferreds();
                        r._transition(e(this)).done(function() {
                            var o = e(this);
                            i = r._renderDownload([ u ]).replaceAll(o);
                            r._forceReflow(i);
                            r._transition(i).done(function() {
                                n.context = e(this);
                                r._trigger("failed", t, n);
                                r._trigger("finished", t, n);
                                s.resolve();
                            });
                        });
                    } else {
                        s = r._addFinishedDeferreds();
                        r._transition(e(this)).done(function() {
                            e(this).remove();
                            r._trigger("failed", t, n);
                            r._trigger("finished", t, n);
                            s.resolve();
                        });
                    }
                }); else if (n.errorThrown !== "abort") {
                    n.context = r._renderUpload(n.files)[r.options.prependFiles ? "prependTo" : "appendTo"](r.options.filesContainer).data("data", n);
                    r._forceReflow(n.context);
                    s = r._addFinishedDeferreds();
                    r._transition(n.context).done(function() {
                        n.context = e(this);
                        r._trigger("failed", t, n);
                        r._trigger("finished", t, n);
                        s.resolve();
                    });
                } else {
                    r._trigger("failed", t, n);
                    r._trigger("finished", t, n);
                    r._addFinishedDeferreds().resolve();
                }
            },
            progress: function(t, n) {
                var r = Math.floor(n.loaded / n.total * 100);
                n.context && n.context.each(function() {
                    e(this).find(".progress").attr("aria-valuenow", r).children().first().css("width", r + "%");
                });
            },
            progressall: function(t, n) {
                var r = e(this), i = Math.floor(n.loaded / n.total * 100), s = r.find(".fileupload-progress"), o = s.find(".progress-extended");
                o.length && o.html((r.data("blueimp-fileupload") || r.data("fileupload"))._renderExtendedProgress(n));
                s.find(".progress").attr("aria-valuenow", i).children().first().css("width", i + "%");
            },
            start: function(t) {
                var n = e(this).data("blueimp-fileupload") || e(this).data("fileupload");
                n._resetFinishedDeferreds();
                n._transition(e(this).find(".fileupload-progress")).done(function() {
                    n._trigger("started", t);
                });
            },
            stop: function(t) {
                var n = e(this).data("blueimp-fileupload") || e(this).data("fileupload"), r = n._addFinishedDeferreds();
                e.when.apply(e, n._getFinishedDeferreds()).done(function() {
                    n._trigger("stopped", t);
                });
                n._transition(e(this).find(".fileupload-progress")).done(function() {
                    e(this).find(".progress").attr("aria-valuenow", "0").children().first().css("width", "0%");
                    e(this).find(".progress-extended").html("&nbsp;");
                    r.resolve();
                });
            },
            processstart: function() {
                e(this).addClass("fileupload-processing");
            },
            processstop: function() {
                e(this).removeClass("fileupload-processing");
            },
            destroy: function(t, n) {
                var r = e(this).data("blueimp-fileupload") || e(this).data("fileupload"), i = function() {
                    r._transition(n.context).done(function() {
                        e(this).remove();
                        r._trigger("destroyed", t, n);
                    });
                };
                if (n.url) {
                    n.dataType = n.dataType || r.options.dataType;
                    e.ajax(n).done(i);
                } else i();
            }
        },
        _resetFinishedDeferreds: function() {
            this._finishedUploads = [];
        },
        _addFinishedDeferreds: function(t) {
            t || (t = e.Deferred());
            this._finishedUploads.push(t);
            return t;
        },
        _getFinishedDeferreds: function() {
            return this._finishedUploads;
        },
        _enableDragToDesktop: function() {
            var t = e(this), n = t.prop("href"), r = t.prop("download"), i = "application/octet-stream";
            t.bind("dragstart", function(e) {
                try {
                    e.originalEvent.dataTransfer.setData("DownloadURL", [ i, r, n ].join(":"));
                } catch (t) {}
            });
        },
        _formatFileSize: function(e) {
            return typeof e != "number" ? "" : e >= 1e9 ? (e / 1e9).toFixed(2) + " GB" : e >= 1e6 ? (e / 1e6).toFixed(2) + " MB" : (e / 1e3).toFixed(2) + " KB";
        },
        _formatBitrate: function(e) {
            return typeof e != "number" ? "" : e >= 1e9 ? (e / 1e9).toFixed(2) + " Gbit/s" : e >= 1e6 ? (e / 1e6).toFixed(2) + " Mbit/s" : e >= 1e3 ? (e / 1e3).toFixed(2) + " kbit/s" : e.toFixed(2) + " bit/s";
        },
        _formatTime: function(e) {
            var t = new Date(e * 1e3), n = Math.floor(e / 86400);
            n = n ? n + "d " : "";
            return n + ("0" + t.getUTCHours()).slice(-2) + ":" + ("0" + t.getUTCMinutes()).slice(-2) + ":" + ("0" + t.getUTCSeconds()).slice(-2);
        },
        _formatPercentage: function(e) {
            return (e * 100).toFixed(2) + " %";
        },
        _renderExtendedProgress: function(e) {
            return this._formatBitrate(e.bitrate) + " | " + this._formatTime((e.total - e.loaded) * 8 / e.bitrate) + " | " + this._formatPercentage(e.loaded / e.total) + " | " + this._formatFileSize(e.loaded) + " / " + this._formatFileSize(e.total);
        },
        _renderTemplate: function(t, n) {
            if (!t) return e();
            var r = t({
                files: n,
                formatFileSize: this._formatFileSize,
                options: this.options
            });
            return r instanceof e ? r : e(this.options.templatesContainer).html(r).children();
        },
        _renderPreviews: function(t) {
            t.context.find(".preview").each(function(n, r) {
                e(r).append(t.files[n].preview);
            });
        },
        _renderUpload: function(e) {
            return this._renderTemplate(this.options.uploadTemplate, e);
        },
        _renderDownload: function(e) {
            return this._renderTemplate(this.options.downloadTemplate, e).find("a[download]").each(this._enableDragToDesktop).end();
        },
        _startHandler: function(t) {
            t.preventDefault();
            var n = e(t.currentTarget), r = n.closest(".template-upload"), i = r.data("data");
            n.prop("disabled", !0);
            i && i.submit && i.submit();
        },
        _cancelHandler: function(t) {
            t.preventDefault();
            var n = e(t.currentTarget).closest(".template-upload,.template-download"), r = n.data("data") || {};
            if (!r.jqXHR) {
                r.context = r.context || n;
                r.errorThrown = "abort";
                this._trigger("fail", t, r);
            } else r.jqXHR.abort();
        },
        _deleteHandler: function(t) {
            t.preventDefault();
            var n = e(t.currentTarget);
            this._trigger("destroy", t, e.extend({
                context: n.closest(".template-download"),
                type: "DELETE"
            }, n.data()));
        },
        _forceReflow: function(t) {
            return e.support.transition && t.length && t[0].offsetWidth;
        },
        _transition: function(t) {
            var n = e.Deferred();
            if (e.support.transition && t.hasClass("fade") && t.is(":visible")) t.bind(e.support.transition.end, function(r) {
                if (r.target === t[0]) {
                    t.unbind(e.support.transition.end);
                    n.resolveWith(t);
                }
            }).toggleClass("in"); else {
                t.toggleClass("in");
                n.resolveWith(t);
            }
            return n;
        },
        _initButtonBarEventHandlers: function() {
            var t = this.element.find(".fileupload-buttonbar"), n = this.options.filesContainer;
            this._on(t.find(".start"), {
                click: function(e) {
                    e.preventDefault();
                    n.find(".start").click();
                }
            });
            this._on(t.find(".cancel"), {
                click: function(e) {
                    e.preventDefault();
                    n.find(".cancel").click();
                }
            });
            this._on(t.find(".delete"), {
                click: function(e) {
                    e.preventDefault();
                    n.find(".toggle:checked").closest(".template-download").find(".delete").click();
                    t.find(".toggle").prop("checked", !1);
                }
            });
            this._on(t.find(".toggle"), {
                change: function(t) {
                    n.find(".toggle").prop("checked", e(t.currentTarget).is(":checked"));
                }
            });
        },
        _destroyButtonBarEventHandlers: function() {
            this._off(this.element.find(".fileupload-buttonbar").find(".start, .cancel, .delete"), "click");
            this._off(this.element.find(".fileupload-buttonbar .toggle"), "change.");
        },
        _initEventHandlers: function() {
            this._super();
            this._on(this.options.filesContainer, {
                "click .start": this._startHandler,
                "click .cancel": this._cancelHandler,
                "click .delete": this._deleteHandler
            });
            this._initButtonBarEventHandlers();
        },
        _destroyEventHandlers: function() {
            this._destroyButtonBarEventHandlers();
            this._off(this.options.filesContainer, "click");
            this._super();
        },
        _enableFileInputButton: function() {
            this.element.find(".fileinput-button input").prop("disabled", !1).parent().removeClass("disabled");
        },
        _disableFileInputButton: function() {
            this.element.find(".fileinput-button input").prop("disabled", !0).parent().addClass("disabled");
        },
        _initTemplates: function() {
            var e = this.options;
            e.templatesContainer = this.document[0].createElement(e.filesContainer.prop("nodeName"));
            if (t) {
                e.uploadTemplateId && (e.uploadTemplate = t(e.uploadTemplateId));
                e.downloadTemplateId && (e.downloadTemplate = t(e.downloadTemplateId));
            }
        },
        _initFilesContainer: function() {
            var t = this.options;
            t.filesContainer === undefined ? t.filesContainer = this.element.find(".files") : t.filesContainer instanceof e || (t.filesContainer = e(t.filesContainer));
        },
        _initSpecialOptions: function() {
            this._super();
            this._initFilesContainer();
            this._initTemplates();
        },
        _create: function() {
            this._super();
            this._resetFinishedDeferreds();
            e.support.fileInput || this._disableFileInputButton();
        },
        enable: function() {
            var e = !1;
            this.options.disabled && (e = !0);
            this._super();
            if (e) {
                this.element.find("input, button").prop("disabled", !1);
                this._enableFileInputButton();
            }
        },
        disable: function() {
            if (!this.options.disabled) {
                this.element.find("input, button").prop("disabled", !0);
                this._disableFileInputButton();
            }
            this._super();
        }
    });
});