/**
 * API Key 和网络验证模块
 * 通过调用模型列表 API 来验证 API Key 的有效性和网络连通性
 * 支持 GLM Coding Plan 和其他任意 AI 服务商
 */
import { logger } from '../utils/logger.js';
import { getProviderById } from './providers.js';
/**
 * 根据套餐类型获取验证 API 的 URL（向后兼容）
 */
function getValidationUrl(plan) {
    return plan === 'glm_coding_plan_global'
        ? 'https://api.z.ai/api/coding/paas/v4/models'
        : 'https://open.bigmodel.cn/api/coding/paas/v4/models';
}
/**
 * 验证 API Key 的有效性和网络连通性
 *
 * @param apiKey - API Key
 * @param planOrProviderId - 套餐类型 (旧) 或 provider ID (新)
 * @returns 验证结果，包含 valid 状态和可选的错误信息
 */
export async function validateApiKey(apiKey, planOrProviderId) {
    // Backward compatibility: if it's a GLM plan, use old validation
    if (planOrProviderId?.startsWith('glm_coding_plan')) {
        return validateWithUrl(apiKey, getValidationUrl(planOrProviderId));
    }
    // For known providers, use their base URL
    const provider = planOrProviderId ? getProviderById(planOrProviderId) : null;
    if (!provider) {
        // Unknown or null provider — skip validation
        return { valid: true };
    }
    // Local providers don't need API key validation
    if (!provider.requiresApiKey) {
        return { valid: true };
    }
    // Generic validation: try to list models at baseURL/models
    if (provider.baseURL) {
        const url = provider.baseURL.replace(/\/$/, '') + '/models';
        return validateWithUrl(apiKey, url);
    }
    // No base URL — skip validation
    return { valid: true };
}
/**
 * Validate API key by calling a models endpoint
 */
async function validateWithUrl(apiKey, url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status === 401) {
            return {
                valid: false,
                error: 'invalid_api_key',
                message: 'API Key is invalid or expired'
            };
        }
        if (response.ok) {
            try {
                const data = await response.json();
                if (data && data.object === 'list') {
                    return { valid: true };
                }
            }
            catch {
                return { valid: true };
            }
            return { valid: true };
        }
        return {
            valid: false,
            error: 'unknown_error',
            message: `HTTP ${response.status}: ${response.statusText}`
        };
    }
    catch (error) {
        logger.logError('validateApiKey', error);
        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                return {
                    valid: false,
                    error: 'network_error',
                    message: 'Request timeout'
                };
            }
            return {
                valid: false,
                error: 'network_error',
                message: error.message
            };
        }
        return {
            valid: false,
            error: 'network_error',
            message: 'Network connection failed'
        };
    }
}
