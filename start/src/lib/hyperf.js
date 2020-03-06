layui.config({
    base: '/js/' //你存放新模块的目录，注意，不是layui的模块目录
}).extend({
    aliossUploader: 'aliossUploader'
}).define(['view', 'table', 'aliossUploader'], function (exports) {

        let $ = layui.jquery,
            view = layui.view,
            setter = layui.setter,
            laytpl = layui.laytpl,
            LAY_BODY = 'LAY_app_body',
            upload = layui.aliossUploader,
            table = layui.table;

        function empty(str) {
            return (typeof str === "undefined" || str == null || str === "");
        }

        let Class = function (id, hyperf) {
                this.id = id;
                this.container = $('#' + (id || LAY_BODY));
                this.hyperf = hyperf;
            },
            Hyperf = function (id) {
                this.id = id;
                this.container = $('#' + (id || LAY_BODY));
                let hyperf = this;

                this.msg = {
                    /**
                     *
                     * @param content
                     * @param options
                     * @param callback
                     * @returns {*}
                     */
                    dialog: function (content, options, callback) {
                        return layer.msg(content || '请填写需要显示的内容', options, typeof callback === 'function' ? callback : '');
                    },
                    /**
                     *
                     * @param content
                     * @param callback
                     * @returns {*}
                     */
                    warning: function (content, callback) {
                        return this.dialog(content, {icon: 7}, callback);
                    },
                    /**
                     *
                     * @param content
                     * @param callback
                     * @returns {*}
                     */
                    success: function (content, callback) {
                        return this.dialog(content, {icon: 6}, callback);
                    },
                    /**
                     *
                     * @param content
                     * @param callback
                     * @returns {*}
                     */
                    error: function (content, callback) {
                        return this.dialog(content, {icon: 5}, callback);
                    },
                    toast: function (content) {
                        return this.dialog(content, {}, false);
                    }
                };

                this.confirm = function (content, yes, no, options) {
                    return layer.confirm(content || '请填写提示的内容', $.extend({
                        btn: ['确定', '取消'],
                        icon: 3,
                        title: '提示'
                    }, options), yes, no);
                };

                this.alert = function (content, callback, options) {
                    return layer.alert(content || '请填写提示的内容', $.extend({
                        // icon: 1,
                        title: '提示'
                    }, options), callback);
                };

                this.loading = function () {
                    return layer.load(3, {
                        shade: [0.1, '#fff'] //0.1透明度的白色背景
                    });
                };

                this.close = function (index) {
                    return layer.close(index);
                };

                this.http = {
                    request: function (options) {
                        let that = this
                            , success = options.success
                            , error = options.error
                            , request = setter.request
                            , response = setter.response
                        ;
                        options.data = options.data || {};
                        options.headers = options.headers || {};
                        options.url = setter.api + options.url;

                        if (request.tokenName) {
                            let sendData = typeof options.data === 'string'
                                ? JSON.parse(options.data)
                                : options.data;

                            //自动给 Request Headers 传入 token
                            options.headers[request.tokenName] = request.tokenName in options.headers
                                ? options.headers[request.tokenName]
                                : (layui.data(setter.tableName)[request.tokenName] || '');
                        }

                        delete options.success;
                        delete options.error;

                        let index = options.loading !== false && hyperf.loading();

                        return $.ajax($.extend({
                            type: 'GET'
                            , dataType: 'json'
                            , crossDomain: true
                            , success: function (res) {
                                //http请求成功回调
                                let statusCode = response.statusCode;
                                //只有 response 的 code 一切正常才执行 done

                                if (res[response.statusName] == statusCode.ok) {
                                    typeof options.done === 'function' && options.done(res);
                                } else if (res[response.statusName] == statusCode.no) {
                                    typeof error === 'function' && error(res);
                                }
                                //登录状态失效，清除本地 access_token，并强制跳转到登入页
                                else if (res[response.statusName] == statusCode.logout) {
                                    view.exit();
                                }
                                //其它异常
                                else {
                                    hyperf.msg.error(res.message);//res.code > 0  一般为逻辑性错误
                                }
                                //只要 http 状态码正常，无论 response 的 code 是否正常都执行 success
                                typeof success === 'function' && success(res);
                            }
                            , error: function (e, code) {
                                //http异常回调
                                hyperf.msg.error('网络请求异常' + code);
                                setter.debug && console.error("Error: %s (%i) URL:%s", e.statusText, e.status, options.url);
                            }, complete: function (XHR) {
                                index && layer.close(index);
                            }
                        }, options));
                    },
                    post: function (options) {
                        this.request($.extend({
                            error: function (res) {
                                hyperf.msg.error(res.msg);
                            }
                        }, options, {'type': 'POST'}));
                    },
                    get: function (options) {
                        this.request($.extend({
                            error: function (res) {
                                hyperf.msg.error(res.msg);
                            }
                        }, options, {'type': 'GET'}));
                    },
                    /**
                     * 表单自动处理
                     * @param obj
                     * @param options
                     */
                    auto: function (obj, options) {

                        let form = obj.form;
                        if (empty(form)) {
                            console.log('请设置form属性');
                            return false;
                        }

                        let m = form.attributes.method,
                            a = form.attributes.action;

                        let method = empty(m) ? 'GET' : (empty(m.nodeValue) ? 'POST' : m.nodeValue),
                            action = empty(a) ? '' : (empty(empty(a.nodeValue)) ? '' : a.nodeValue);

                        if (empty(action)) {
                            console.log('请填写form的action属性');
                            return false;
                        }

                        this.request($.extend({
                            url: form.attributes.action.nodeValue,
                            method: method,
                            data: obj.field
                        }, $.extend({
                            done: function (res) {
                                hyperf.msg.success(res.msg);
                            },
                            error: function (res) {
                                hyperf.msg.error(res.msg);
                            }
                        }, options)));
                    }
                };
                /**
                 * 图片
                 * @type {{album: album, one: (function(*=, *=): (*|void))}}
                 */
                this.photo = {
                    //单张图片显示
                    one: function (src, options) {
                        return this.album([{
                            src: src
                        }], options);
                    },
                    //多张张图片显示
                    album: function (data, options) {
                        layer.photos($.extend({
                            photos: {
                                data: data
                            }
                            , shade: 0.01//背景透明度
                            , closeBtn: 1//是否显示关闭按钮
                            , anim: 5//图片入场方式
                        }, options));
                    }
                };
                /**
                 * 表格
                 * @type {{checkStatus: (function(*=): *), t: (function(*=): (jQuery|any|{})), render: (function(*=): *)}}
                 */
                this.table = {
                    checkStatus: function (id) {
                        return table.checkStatus(id);
                    },
                    render: function (options) {
                        return table.render(this.t(options))
                    },
                    // reload: function (id, options) {
                    //     return table.reload(id, this.t(options))
                    // },
                    t: function (options) {
                        //拼装headers信息
                        let request = setter.request,
                            headers = {};
                        options.url = setter.api + options.url;
                        headers[request.tokenName] = (layui.data(setter.tableName)[request.tokenName] || '');

                        return $.extend(options, {
                            headers: headers,
                            text: {
                                none: '暂无相关数据'
                            }
                        });
                    }
                };
                /**
                 * 弹层
                 * @param options
                 * @returns {Class.index}
                 */
                this.popup = function (options) {
                    let success = options.success
                        , skin = options.skin;

                    delete options.success;
                    delete options.skin;

                    return layer.open($.extend({
                        type: 1
                        , title: '提示'
                        , content: ''
                        , id: 'LAY-system-view-popup'
                        , skin: 'layui-layer-admin' + (skin ? ' ' + skin : '')
                        , shadeClose: true
                        , closeBtn: false
                        , success: function (layero, index) {
                            let elemClose = $('<i class="layui-icon" close>&#x1006;</i>');
                            layero.append(elemClose);
                            elemClose.on('click', function () {
                                // layer.close(index);
                                hyperf.close(index);
                            });
                            typeof success === 'function' && success.apply(this, arguments);
                        }
                    }, options))
                };
                /**
                 * 页面处理
                 * @type {{refreshAll: refreshAll, forward: forward, refresh: refresh, back: back, href: href}}
                 */
                this.page = {
                    href: function (href) {
                        location.hash = href;
                    },
                    refresh: function () {
                        layui.index.render();
                    },
                    refreshAll: function () {
                        location.reload();
                    },
                    back: function () {
                        history.back();
                    },
                    forward: function () {
                        history.forward();
                    }
                };
                /**
                 * 自动处理
                 * @type {{api: api, info: info}}
                 */
                this.auto = {
                    info: function (options) {
                        if (!(options.hasOwnProperty('data') && options.hasOwnProperty('url') && options.hasOwnProperty('title') && options.hasOwnProperty('view'))) {
                            hyperf.msg.error('参数缺失！');
                            return false;
                        }

                        let success = options.success;
                        let d = options.data;

                        delete options.success;

                        return hyperf.popup($.extend({
                            title: '弹窗'
                            , area: ['600px', '480px']
                            , id: 'LAY-popup-user-add'
                            , success: function (layero, index) {
                                let viewIndex = this.id;
                                hyperf.view(viewIndex).render(options.view).done(function (r) {
                                    hyperf.http.get({
                                        url: options.url,
                                        data: d,
                                        success: function (res) {
                                            typeof success === 'function' && success.apply(this, arguments);
                                        }
                                    });
                                });
                            }
                        }, options));
                    },
                    api: function (url, id) {
                        hyperf.http.post({
                            url: url,
                            data: {
                                id: id
                            },
                            success: function (res) {
                                hyperf.msg.success(res.msg, function () {
                                    hyperf.page.refresh();
                                });
                            }
                        });
                    }
                };

                this.view = function (id) {
                    console.log('hyperf view');
                    return new Class(id, this);
                }
            };

        //请求模板文件渲染
        Class.prototype.render = function (views, params) {
            var that = this, router = layui.router();
            views = setter.views + views + setter.engine;

            $('#' + LAY_BODY).children('.layadmin-loading').remove();
            // view.loading(that.container); //loading
            console.log(that.hyperf);
            //请求模板
            $.ajax({
                url: views
                , type: 'get'
                , dataType: 'html'
                , data: {
                    v: layui.cache.version
                }
                , success: function (html) {
                    html = '<div>' + html + '</div>';
                    let $html = $(html);
                    var elemTitle = $html.find('title')
                        , title = elemTitle.text() || (html.match(/\<title\>([\s\S]*)\<\/title>/) || [])[1];

                    var res = {
                        title: title
                        , body: html
                    };

                    elemTitle.remove();
                    that.params = params || {}; //获取参数

                    if (that.then) {
                        that.then(res);
                        delete that.then;
                    }

                    that.parse(html);
                    // view.removeLoad();

                    if (that.done) {
                        that.done(res);
                        delete that.done;
                    }

                    that.delay(html);
                }
                , error: function (e) {
                    // view.removeLoad();
                    if (e.status === 404) {
                        // that.render('template/tips/404');
                        that.hyperf.page.href('/template/tips/404');
                    } else {
                        that.hyperf.page.href('/template/tips/error');
                        // that.render('template/tips/error');
                    }

                    that.render.isError = true;
                }
            });
            return that;
        };

        Class.prototype.delay = function (html) {
            setTimeout(function () {
                console.log();
                $('#' + LAY_BODY).find('[data-file]:not([data-inited])').map(function (index, elem, $this, field) {

                    $this = $(elem), field = $this.attr('data-field') || 'file';
                    if (!$this.data('input')) $this.data('input', $('[name="' + field + '"]').get(0));
                    console.log($this);
                    $this.uploadFile(function (res) {
                        let $input = $($this.data('input'));
                        $input.val(res.ossUrl).trigger('change');
                    });

                });
            }, 1000);
        };

        //解析模板
        Class.prototype.parse = function (html, refresh, callback) {

            var that = this
                , isScriptTpl = typeof html === 'object' //是否模板元素
                , elem = isScriptTpl ? html : $(html)
                , elemTemp = isScriptTpl ? html : elem.find('*[template]')
                , fn = function (options) {
                var tpl = laytpl(options.dataElem.html())
                    , res = $.extend({
                    params: router.params
                }, options.res);

                options.dataElem.after(tpl.render(res));
                typeof callback === 'function' && callback();

                try {
                    options.done && new Function('d', options.done)(res);
                } catch (e) {
                    console.error(options.dataElem[0], '\n存在错误回调脚本\n\n', e)
                }
            }
                , router = layui.router();

            elem.find('title').remove();
            that.container[refresh ? 'after' : 'html'](elem.children());

            router.params = that.params || {};

            //遍历模板区块
            for (var i = elemTemp.length; i > 0; i--) {
                (function () {
                    var dataElem = elemTemp.eq(i - 1)
                        , layDone = dataElem.attr('lay-done') || dataElem.attr('lay-then') //获取回调
                        , url = laytpl(dataElem.attr('lay-url') || '').render(router) //接口 url
                        , data = laytpl(dataElem.attr('lay-data') || '').render(router) //接口参数
                        , headers = laytpl(dataElem.attr('lay-headers') || '').render(router); //接口请求的头信息

                    try {
                        data = new Function('return ' + data + ';')();
                    } catch (e) {
                        hint.error('lay-data: ' + e.message);
                        data = {};
                    }
                    ;

                    try {
                        headers = new Function('return ' + headers + ';')();
                    } catch (e) {
                        hint.error('lay-headers: ' + e.message);
                        headers = headers || {}
                    }

                    if (url) {

                        if (null === url.match(/\.(jpg|png|jpeg|json|html|htm)[?&]?/g)) {
                            url = setter.api + url;
                        }

                        view.req({
                            type: dataElem.attr('lay-type') || 'get'
                            , url: url
                            , data: data
                            , dataType: 'json'
                            , headers: headers
                            , success: function (res) {
                                fn({
                                    dataElem: dataElem
                                    , res: res
                                    , done: layDone
                                });
                            }
                        });
                    } else {
                        fn({
                            dataElem: dataElem
                            , done: layDone
                        });
                    }
                }());
            }

            return that;
        };

        //直接渲染字符
        Class.prototype.send = function (views, data) {
            var tpl = laytpl(views || this.container.html()).render(data || {});
            this.container.html(tpl);
            return this;
        };

        //局部刷新模板
        Class.prototype.refresh = function (callback) {
            var that = this
                , next = that.container.next()
                , templateid = next.attr('lay-templateid');

            if (that.id != templateid) return that;

            that.parse(that.container, 'refresh', function () {
                that.container.siblings('[lay-templateid="' + that.id + '"]:last').remove();
                typeof callback === 'function' && callback();
            });

            return that;
        };

        //视图请求成功后的回调
        Class.prototype.then = function (callback) {
            this.then = callback;
            return this;
        };

        //视图渲染完毕后的回调
        Class.prototype.done = function (callback) {
            this.done = callback;
            return this;
        };

        let my = new Hyperf(),
            events = {
                /**
                 * 删除
                 * @param self
                 */
                del: function (self) {
                    let that = $(self),
                        url = that.attr('hyperf-url') || '',
                        id = that.attr('hyperf-del') || '';
                    my.confirm('确定删除吗？', function (index) {
                        id && url && my.auto.api(url, id);
                    });
                },
                /**
                 * 禁用
                 * @param self
                 */
                forbid: function (self) {
                    let that = $(self),
                        url = that.attr('hyperf-url') || '',
                        id = that.attr('hyperf-forbid') || '';

                    id && url && my.auto.api(url, id);
                },
                /**
                 * 启用
                 * @param self
                 */
                resume: function (self) {
                    let that = $(self),
                        url = that.attr('hyperf-url') || '',
                        id = that.attr('hyperf-resume') || '';
                    id && url && my.auto.api(url, id);
                },
                /**
                 * 图片预览
                 * @param othis
                 */
                preview: function (othis) {

                    let src = $(othis).attr('hyperf-preview');
                    if (!src) {
                        // console.log('图片地址为空');
                        return false;
                    }

                    my.photo.one(src);
                },
                /**
                 * 相册
                 * @param othis
                 * @returns {boolean}
                 */
                album: function (othis) {
                    console.log($(othis).attr('hyperf-album'));

                    let src = $(othis).attr('hyperf-album');
                    if (!src) {
                        // console.log('图片地址为空');
                        return false;
                    }

                    my.photo.album(src);
                },
            },
            $body = $('body');

        $body.on('click', '[hyperf-del]', function () {
            events['del'] && events['del'].call(this, this);
        }).on('click', '[hyperf-forbid]', function () {
            events['forbid'] && events['forbid'].call(this, this);
        }).on('click', '[hyperf-resume]', function () {
            events['resume'] && events['resume'].call(this, this);
        }).on('click', '[hyperf-load]', function () {
            my.page.href(this);
        }).on('click', '[hyperf-refresh]', function () {
            my.page.refresh();
        }).on('click', '[hyperf-back]', function () {
            my.page.back();
        }).on('click', '[hyperf-forward]', function () {
            my.page.forward();
        }).on('click', '[hyperf-preview]', function () {
            events['preview'] && events['preview'].call(this, this);
            return false;
        }).on('click', '[hyperf-album]', function () {
            events['album'] && events['album'].call(this, this);
        });

        $.fn.extend({
            uploadFile: function (callback) {
                if (this.attr('data-inited')) return false;
                let that = this, mode = $(this).attr('data-file') || 'one';
                this.attr('data-inited', true).attr('data-multiple', (mode !== 'btn' && mode !== 'one') ? 1 : 0);

                my.http.get({
                    url: '/plugin/upload/getOss',
                    done: function (res) {
                        let {accessKeyId, dir, host, maxSize, policy, signature} = res.data;

                        upload.render({
                            elm: that,
                            host: host,
                            layerTitle: '上传数据文件',
                            accessId: accessKeyId,
                            policy: policy,
                            signature: signature,
                            prefixPath: dir,
                            maxSize: maxSize,
                            fileType: 'images',
                            multiple: false,
                            allUploaded: function (res) {
                                console.log(res);
                                // avatarSrc.val(res.ossUrl);
                                // avatarPreview.attr('hyperf-preview', res.ossUrl);
                                callback(res);
                            }
                        });
                    }
                });
            },
            uploadOneImage: function (callback) {
                let $that = this,
                    name = $that.attr('name') || 'image', type = $that.data('type') || 'png,jpg,gif',
                    $tpl = $('<a data-file="btn" class="uploadimage"></a>').attr('data-field', name).attr('data-type', type);
                console.log($that);
                $that.attr('name', name).after($tpl.data('input', this)).on('change', function () {
                    console.log('uploadOneImage change');
                    if (this.value) $tpl.css('backgroundImage', 'url(' + this.value + ')');
                }).trigger('change');

            },
            uploadMultipleImage: function () {
                let $that = $(this);
                var type = $that.data('type') || 'png,jpg,gif', name = $that.attr('name') || 'umt-image';
                var $tpl = $('<a class="uploadimage"></a>').attr('data-file', 'mul').attr('data-field', name).attr('data-type', type);

                console.log($that);
                $that.attr('name', name).after($tpl.data('input', this)).on('change', function () {
                    console.log('uploadMultipleImage change');
                    var input = this;
                    this.setImageData = function () {
                        input.value = input.getImageData().join('|');
                    };
                    this.getImageData = function () {
                        var values = [];
                        $(input).prevAll('.uploadimage').map(function () {
                            values.push($that.attr('data-tips-image'));
                        });
                        return values.reverse(), values;
                    };
                    var urls = this.getImageData(), srcs = this.value.split('|');
                    for (var i in srcs) if (srcs[i]) urls.push(srcs[i]);
                    $that.prevAll('.uploadimage').remove();
                    this.value = urls.join('|');
                    for (var i in urls) {
                        var tpl = '<div class="uploadimage uploadimagemtl"><a class="layui-icon margin-right-5">&#xe602;</a><a class="layui-icon margin-right-5">&#x1006;</a><a class="layui-icon margin-right-5">&#xe603;</a></div>';
                        var $tpl = $(tpl).attr('data-tips-image', urls[i]).css('backgroundImage', 'url(' + urls[i] + ')').on('click', 'a', function (e) {
                            e.stopPropagation();
                            var $cur = $(this).parent();
                            console.log($cur);
                            switch ($(this).index()) {
                                case 1:// remove
                                    return my.confirm('确定要移除这张图片吗？', function (index) {
                                        $cur.remove(), input.setImageData(), my.close(index);
                                    });
                                case 0: // right
                                    var lenght = $cur.siblings('div.uploadimagemtl').length;
                                    if ($cur.index() !== lenght) $cur.next().after($cur);
                                    return input.setImageData();
                                case 2: // left
                                    if ($cur.index() !== 0) $cur.prev().before($cur);
                                    return input.setImageData();
                            }
                        });
                        $(this).before($tpl);
                    }
                }).trigger('change');
            }
        });


        exports('hyperf', my);
    }
);

