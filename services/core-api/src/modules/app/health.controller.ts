import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
@ApiTags("health")
@Controller("health")
export class HealthController{ @Public() @Get() get(){ return {ok:true, service:"zypocare-core-api", time:new Date().toISOString()};}}
