import aiohttp
import asyncio
import json
from datetime import datetime
import locale
from gettext import gettext as _

from jinja2 import Template

from astersay.actions import BaseAction, BaseListenAction, AioHttpAction, ActionProps, ConvertAction
from astersay.dialog import BaseDialog


GLOBAL_ANKETA = ""


def order_dict(dictionary):
    return {k: order_dict(v) if isinstance(v, dict) else v
            for k, v in sorted(dictionary.items())}


def format_date(date: str, ret_format: str):
    locale.setlocale(locale.LC_TIME, 'ru_RU.UTF-8')
    date_dt = datetime.strptime(date, '%Y-%m-%d')
    return date_dt.strftime(ret_format)


def current_date():
    now = datetime.now()
    return now


def request_is_fail(value):
    is_fail = [
        not isinstance(value, dict),
        'data' not in value,
        value.get('error_code') != 0,
    ]
    return any(is_fail) or not isinstance(value['data'], list) or len(value['data']) == 0


class MakeRequestAioHttpMixin:

    async def make_request(self, session: aiohttp.ClientSession, request_params):
        async with session.request(self.method, self.url, **request_params) as resp:
            if resp.status not in (200, 201, 203):
                return
            try:
                data = await resp.text()
                return json.loads(data)
            except Exception as ex:
                self.logger.error(
                    _('Ошибка при чтении json ответа %s'), str(ex))


class AuthAction(AioHttpAction):
    TYPE = 'auth'
    TIMEOUT = {'total': 30}

    def set_additional_variable(self):
        if not isinstance(self.value, dict) or 'sess_id' not in self.value:
            self.logger.error(
                _('Не корректный ответ на авторизацию: %s'), self.value)
            self.result = False
            return
        self.variable_set('sess_id', self.value['sess_id'])


class Jinja2Action(BaseAction):
    TYPE = 'jinja2'

    def __init__(self, name: str, config: dict, dialog, **kwargs):
        super().__init__(name, config, dialog, **kwargs)
        assert 'template' in config
        self.template = config['template']
        self.variables = dialog.variables

    async def execute(self):
        template = Template(self.template)
        self.value = template.render(**self.variables)
        self.result = True


class ParseSnilsAction(BaseListenAction):
    TYPE = 'parse_snils'
    PRIMARY: bool = True

    def execute(self):
        if self.result:
            return
        text = self.text_from_text_buffer(self.mode_buffer, self.text_buffer)
        self.logger.info('Текст для СНИЛС %s', text)
        digits = ''.join([x for x in text if x.isdigit()])
        if len(digits) >= 11:
            snils = digits[-11:]
            self.logger.info('Распознанный СНИЛС %s', snils)
            self.result = True
            self.value = snils


class ParseNumberAction(BaseListenAction):
    TYPE = 'parse_number'
    PRIMARY: bool = True

    def execute(self):
        if self.result:
            return
        text = self.text_from_text_buffer(self.mode_buffer, self.text_buffer)
        dig = ''.join([x for x in text if x.isdigit()])
        if len(dig) > 5:
            self.value = dig
            self.result = True
